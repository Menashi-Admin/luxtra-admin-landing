/**
 * LUXTRA × Shopify Storefront API Integration
 * Handles products, cart, and checkout via the Storefront GraphQL API.
 */
const ShopifyStore = (() => {
    const STORE_DOMAIN = 'luxtra-hair.myshopify.com';
    const STOREFRONT_TOKEN = 'ce79551956b3efec132ac995500b7704';
    const API_VERSION = '2025-01';
    const ENDPOINT = `https://${STORE_DOMAIN}/api/${API_VERSION}/graphql.json`;

    let cartId = null;
    let checkoutUrl = null;

    /* ── GraphQL Fetch Helper ── */
    async function gql(query, variables = {}) {
        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
            },
            body: JSON.stringify({ query, variables }),
        });
        const json = await res.json();
        if (json.errors) {
            console.error('[Shopify]', json.errors);
            throw new Error(json.errors[0].message);
        }
        return json.data;
    }

    /* ── Cart fragment (reused across mutations) ── */
    const CART_FRAGMENT = `
        fragment CartFields on Cart {
            id
            checkoutUrl
            totalQuantity
            lines(first: 50) {
                edges {
                    node {
                        id
                        quantity
                        merchandise {
                            ... on ProductVariant {
                                id
                                title
                                price { amount currencyCode }
                                image { url altText }
                                product {
                                    title
                                    handle
                                    images(first: 1) {
                                        edges { node { url altText } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            cost {
                subtotalAmount { amount currencyCode }
                totalAmount { amount currencyCode }
            }
        }
    `;

    /* ── Fetch Products ── */
    async function fetchProducts(first = 20) {
        const data = await gql(`
            query ($first: Int!) {
                products(first: $first, sortKey: TITLE) {
                    edges {
                        node {
                            id
                            title
                            handle
                            description
                            descriptionHtml
                            productType
                            availableForSale
                            priceRange {
                                minVariantPrice { amount currencyCode }
                            }
                            images(first: 10) {
                                edges { node { url altText } }
                            }
                            variants(first: 20) {
                                edges {
                                    node {
                                        id
                                        title
                                        availableForSale
                                        price { amount currencyCode }
                                        image { url altText }
                                        selectedOptions { name value }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `, { first });
        return data.products.edges.map(e => e.node);
    }

    /* ── Fetch Single Product by Handle ── */
    async function fetchProductByHandle(handle) {
        const data = await gql(`
            query ($handle: String!) {
                product(handle: $handle) {
                    id
                    title
                    handle
                    description
                    descriptionHtml
                    productType
                    availableForSale
                    priceRange {
                        minVariantPrice { amount currencyCode }
                        maxVariantPrice { amount currencyCode }
                    }
                    images(first: 10) {
                        edges { node { url altText } }
                    }
                    variants(first: 20) {
                        edges {
                            node {
                                id
                                title
                                availableForSale
                                price { amount currencyCode }
                                image { url altText }
                                selectedOptions { name value }
                            }
                        }
                    }
                }
            }
        `, { handle });
        return data.product;
    }

    /* ── Create Cart ── */
    async function createCart(lines = []) {
        const data = await gql(`
            mutation ($input: CartInput!) {
                cartCreate(input: $input) {
                    cart { ...CartFields }
                    userErrors { field message }
                }
            }
            ${CART_FRAGMENT}
        `, { input: { lines } });

        if (data.cartCreate.userErrors.length) throw new Error(data.cartCreate.userErrors[0].message);
        const cart = data.cartCreate.cart;
        cartId = cart.id;
        checkoutUrl = cart.checkoutUrl;
        localStorage.setItem('luxtra_cart_id', cartId);
        return normalizeCart(cart);
    }

    /* ── Fetch Existing Cart ── */
    async function fetchCart(id) {
        const data = await gql(`
            query ($id: ID!) { cart(id: $id) { ...CartFields } }
            ${CART_FRAGMENT}
        `, { id });
        if (!data.cart) return null;
        checkoutUrl = data.cart.checkoutUrl;
        return normalizeCart(data.cart);
    }

    /* ── Add to Cart ── */
    async function addToCart(variantId, quantity = 1) {
        if (!cartId) return createCart([{ merchandiseId: variantId, quantity }]);

        const data = await gql(`
            mutation ($cartId: ID!, $lines: [CartLineInput!]!) {
                cartLinesAdd(cartId: $cartId, lines: $lines) {
                    cart { ...CartFields }
                    userErrors { field message }
                }
            }
            ${CART_FRAGMENT}
        `, { cartId, lines: [{ merchandiseId: variantId, quantity }] });

        if (data.cartLinesAdd.userErrors.length) throw new Error(data.cartLinesAdd.userErrors[0].message);
        checkoutUrl = data.cartLinesAdd.cart.checkoutUrl;
        return normalizeCart(data.cartLinesAdd.cart);
    }

    /* ── Update Line Quantity ── */
    async function updateCartLine(lineId, quantity) {
        const data = await gql(`
            mutation ($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
                cartLinesUpdate(cartId: $cartId, lines: $lines) {
                    cart { ...CartFields }
                    userErrors { field message }
                }
            }
            ${CART_FRAGMENT}
        `, { cartId, lines: [{ id: lineId, quantity }] });

        if (data.cartLinesUpdate.userErrors.length) throw new Error(data.cartLinesUpdate.userErrors[0].message);
        checkoutUrl = data.cartLinesUpdate.cart.checkoutUrl;
        return normalizeCart(data.cartLinesUpdate.cart);
    }

    /* ── Remove Line ── */
    async function removeCartLine(lineId) {
        const data = await gql(`
            mutation ($cartId: ID!, $lineIds: [ID!]!) {
                cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
                    cart { ...CartFields }
                    userErrors { field message }
                }
            }
            ${CART_FRAGMENT}
        `, { cartId, lineIds: [lineId] });

        checkoutUrl = data.cartLinesRemove.cart.checkoutUrl;
        return normalizeCart(data.cartLinesRemove.cart);
    }

    /* ── Normalize cart into a simple object ── */
    function normalizeCart(cart) {
        return {
            id: cart.id,
            checkoutUrl: cart.checkoutUrl,
            totalQuantity: cart.totalQuantity,
            subtotal: cart.cost.subtotalAmount,
            total: cart.cost.totalAmount,
            lines: cart.lines.edges.map(e => {
                const n = e.node;
                const v = n.merchandise;
                const productImg = v.product.images.edges[0]?.node.url || '';
                return {
                    lineId: n.id,
                    variantId: v.id,
                    variantTitle: v.title,
                    productTitle: v.product.title,
                    quantity: n.quantity,
                    price: v.price,
                    image: v.image?.url || productImg,
                };
            }),
        };
    }

    /* ── Format Price ── */
    function formatPrice(amount, currencyCode = 'NGN') {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 0,
        }).format(Number(amount));
    }

    /* ── Init (restore cart from localStorage) ── */
    async function init() {
        const saved = localStorage.getItem('luxtra_cart_id');
        if (saved) {
            try {
                const cart = await fetchCart(saved);
                if (cart) { cartId = saved; return cart; }
            } catch (e) {
                console.warn('[Shopify] Could not restore cart:', e.message);
            }
            localStorage.removeItem('luxtra_cart_id');
        }
        return null;
    }

    return { init, fetchProducts, fetchProductByHandle, addToCart, updateCartLine, removeCartLine, formatPrice, getCheckoutUrl: () => checkoutUrl };
})();
