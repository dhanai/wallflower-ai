import Shopify from 'shopify-api-node';

let shopifyClient: Shopify | null = null;

/**
 * Initialize Shopify client
 */
export function getShopifyClient(): Shopify {
  if (!shopifyClient) {
    shopifyClient = new Shopify({
      shopName: process.env.SHOPIFY_STORE_DOMAIN!.replace('.myshopify.com', ''),
      accessToken: process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN!,
      apiVersion: '2024-10',
    });
  }
  return shopifyClient;
}

/**
 * Create a product with a design image on a t-shirt
 */
export async function createProductWithDesign(
  title: string,
  designImageUrl: string,
  price: string = '29.99'
) {
  const shopify = getShopifyClient();

  try {
    // Create product
    const product = await shopify.product.create({
      title: title,
      body_html: `<p>Custom designed t-shirt</p><img src="${designImageUrl}" alt="${title}" />`,
      vendor: 'Wallflower AI',
      product_type: 'T-Shirt',
      variants: [
        {
          price: price,
          inventory_management: 'shopify',
          inventory_quantity: 999,
        },
      ],
      images: [
        {
          src: designImageUrl,
        },
      ],
    });

    return product;
  } catch (error) {
    console.error('Error creating Shopify product:', error);
    throw error;
  }
}

/**
 * Create a checkout URL for a product
 */
export async function createCheckoutUrl(productId: string, variantId: string): Promise<string> {
  // This would typically use Shopify Storefront API
  // For now, return a product page URL
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN!;
  return `https://${shopDomain}/products/${productId}?variant=${variantId}`;
}
