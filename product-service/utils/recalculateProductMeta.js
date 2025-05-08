function recalculateProductMeta(product) {
    const variants = product.variants || [];
  
    const prices = variants.map(v => v.price);
    const stocks = variants.map(v => v.stock);
  
    product.price = Math.min(...prices);
    product.totalStock = stocks.reduce((sum, stock) => sum + stock, 0);
}

  module.exports = { recalculateProductMeta };