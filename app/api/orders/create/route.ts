import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProductWithDesign, createCheckoutUrl } from '@/lib/shopify/client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { designId, imageUrl, title, price } = body;

    if (!imageUrl || !title) {
      return NextResponse.json(
        { error: 'Image URL and title are required' },
        { status: 400 }
      );
    }

    // Create product in Shopify
    const shopifyProduct = await createProductWithDesign(
      title,
      imageUrl,
      price || '29.99'
    );

    // Create order record
    const { data: order, error: dbError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        design_id: designId || null,
        shopify_product_id: shopifyProduct.id.toString(),
        shopify_variant_id: shopifyProduct.variants[0]?.id?.toString() || null,
        checkout_url: await createCheckoutUrl(
          shopifyProduct.id.toString(),
          shopifyProduct.variants[0]?.id?.toString() || ''
        ),
        status: 'pending',
        total_amount: parseFloat(price || '29.99'),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    return NextResponse.json({ 
      order,
      checkoutUrl: order.checkout_url,
      shopifyProduct,
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
