import { normalizePrintfulProducts, normalizeShopifyProducts } from "../provider-normalizers"

describe("marketplace provider normalizers", () => {
  it("normalizes Printful products and variants", () => {
    const products = normalizePrintfulProducts({
      data: [
        {
          id: "pf-product-1",
          name: "Tour Hoodie",
          thumbnail_url: "https://img.test/hoodie.png",
          variants: [
            { id: "4011", name: "Black / M", retail_price: "42.50", sku: "hoodie-m" },
          ],
        },
      ],
    })

    expect(products).toHaveLength(1)
    expect(products[0]).toMatchObject({
      provider: "printful",
      externalProductId: "pf-product-1",
      title: "Tour Hoodie",
      productType: "pod_print",
      category: "merch",
    })
    expect(products[0].variants[0]).toMatchObject({
      externalVariantId: "4011",
      price: 42.5,
      sku: "hoodie-m",
    })
  })

  it("normalizes Shopify GraphQL product nodes", () => {
    const products = normalizeShopifyProducts({
      data: {
        products: {
          edges: [
            {
              node: {
                id: "gid://shopify/Product/1",
                title: "Vinyl",
                totalInventory: 12,
                variants: {
                  edges: [
                    {
                      node: {
                        id: "gid://shopify/ProductVariant/2",
                        title: "Signed",
                        sku: "vinyl-signed",
                        price: "35.00",
                        inventoryQuantity: 4,
                        selectedOptions: [{ name: "Edition", value: "Signed" }],
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    })

    expect(products).toHaveLength(1)
    expect(products[0]).toMatchObject({
      provider: "shopify",
      externalProductId: "gid://shopify/Product/1",
      title: "Vinyl",
      productType: "physical_merch",
    })
    expect(products[0].variants[0]).toMatchObject({
      externalVariantId: "gid://shopify/ProductVariant/2",
      price: 35,
      inventoryCount: 4,
      optionValues: { Edition: "Signed" },
    })
  })
})
