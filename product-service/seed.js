const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const Product = require('./models/productModel');
const Rating = require('./models/ratingModel');
const Comment = require('./models/commentModel');

const categories = [
  'cpu', 'motherboard', 'gpu', 'ram', 'hdd', 'ssd', 'nvme',
  'psu', 'case', 'cooling-air', 'cooling-liquid',
  'optical', 'fans', 'expansion', 'cables', 'thermal',
  'bios', 'mounting'
];

const productNames = {
  cpu: ['Intel Core i9-13900K', 'AMD Ryzen 9 7950X', 'Intel Core i5-12600K', 'AMD Ryzen 5 7600X'],
  motherboard: ['ASUS ROG Strix B550-F', 'MSI MPG Z790 Carbon', 'Gigabyte AORUS X670', 'ASRock B660M Pro RS'],
  gpu: ['NVIDIA GeForce RTX 4090', 'AMD Radeon RX 7900 XTX', 'NVIDIA RTX 4070 Ti', 'AMD RX 6700 XT'],
  ram: ['Corsair Vengeance LPX 16GB', 'G.SKILL Trident Z RGB 32GB', 'Kingston Fury Beast 16GB', 'Crucial Ballistix 8GB'],
  hdd: ['Seagate Barracuda 2TB', 'WD Blue 1TB', 'Toshiba X300 4TB', 'HGST Ultrastar 6TB'],
  ssd: ['Samsung 870 EVO 1TB', 'Crucial MX500 500GB', 'WD Blue 3D NAND 1TB', 'SanDisk SSD Plus 240GB'],
  nvme: ['Samsung 980 PRO 1TB', 'WD Black SN850X 2TB', 'Sabrent Rocket 4 Plus', 'Kingston KC3000 1TB'],
  psu: ['Corsair RM750x', 'EVGA SuperNOVA 650 G5', 'Seasonic Focus GX-850', 'Cooler Master MWE 650W'],
  case: ['NZXT H510', 'Corsair 4000D Airflow', 'Fractal Design Meshify C', 'Cooler Master MasterBox Q300L'],
  'cooling-air': ['Noctua NH-D15', 'Cooler Master Hyper 212 Black', 'be quiet! Dark Rock Pro 4', 'Arctic Freezer 34 eSports'],
  'cooling-liquid': ['NZXT Kraken X73', 'Corsair H100i Elite', 'Lian Li Galahad 240', 'ARCTIC Liquid Freezer II 280'],
  optical: ['ASUS DRW-24D5MT', 'LG WH16NS40 Blu-ray', 'Lite-On iHAS124', 'Pioneer BDR-XS06'],
  fans: ['Corsair LL120 RGB', 'Noctua NF-A12x25', 'ARCTIC F12 PWM', 'be quiet! Silent Wings 3'],
  expansion: ['ASUS ThunderboltEX 4', 'Elgato Game Capture 4K60 Pro', 'TP-Link TX401 PCIe', 'StarTech USB 3.0 Card'],
  cables: ['Cable Matters SATA III', 'UGREEN USB-C to USB-A', 'Corsair Premium PSU Cables', 'AmazonBasics HDMI 2.1'],
  thermal: ['Arctic MX-6', 'Noctua NT-H2', 'Thermal Grizzly Kryonaut', 'Cooler Master MasterGel Pro'],
  bios: ['ASUS BIOS Chip B550', 'MSI BIOS Flashback Module', 'Gigabyte BIOS Firmware Flash', 'ASRock UEFI BIOS Kit'],
  mounting: ['NZXT Vertical GPU Mount Kit', 'Thermaltake Riser Cable', 'SilverStone SSD Mounting Bracket', 'Corsair HDD Tray']
};

const IMAGES_PER_CATEGORY = 10;
const VARIANTS_PER_PRODUCT = 2;

async function seedDatabase() {
  await mongoose.connect('mongodb://localhost:27017/product_service');

  await Product.deleteMany({});
  await Rating.deleteMany({});
  await Comment.deleteMany({});

  const allProducts = [];

  for (let i = 0; i < 100; i++) {
    const tag = categories[i % categories.length];
    const imageNum = faker.number.int({ min: 1, max: IMAGES_PER_CATEGORY });
    const productImage = `${tag}_image_${imageNum}.avif`;
    let productPrice = -1;
    let productStock = 0;

    // Pick a real-life product name
    const possibleNames = productNames[tag];
    const productName = possibleNames ? faker.helpers.arrayElement(possibleNames) : faker.commerce.productName();

    const variantNamesByTag = {
  cpu: ['Standard Edition', 'Overclocked Edition'],
  gpu: ['8GB VRAM', '12GB VRAM'],
  ram: ['16GB (2x8GB)', '32GB (2x16GB)'],
  hdd: ['2TB 7200RPM', '4TB 5400RPM'],
  ssd: ['500GB', '1TB'],
  nvme: ['1TB Gen4', '2TB Gen4'],
  psu: ['650W', '850W Gold'],
  case: ['Black', 'White'],
  'cooling-air': ['Single Fan', 'Dual Fan'],
  'cooling-liquid': ['240mm', '360mm'],
  optical: ['DVD-RW', 'Blu-ray'],
  fans: ['RGB', 'Silent'],
  expansion: ['Standard', 'Pro Version'],
  cables: ['1m Length', '2m Length'],
  thermal: ['Standard', 'Extreme'],
  bios: ['Basic Kit', 'Pro Flash'],
  mounting: ['Horizontal', 'Vertical']
};

const variants = Array.from({ length: VARIANTS_PER_PRODUCT }, (_, index) => {
  const variantImageIndex = faker.number.int({ min: 1, max: IMAGES_PER_CATEGORY });
  const tempPrice = faker.number.int({ min: 50, max: 20000000 });
  const tempStock = faker.number.int({ min: 5, max: 50 });

  if (productPrice < 0) productPrice = tempPrice;
  else if (productPrice > tempPrice) productPrice = tempPrice;

  productStock += tempStock;

  const variantName =
    variantNamesByTag[tag]?.[index] ??
    `Model ${faker.string.alphanumeric(4).toUpperCase()}`;

  return {
    variantName,
    extraDescription: faker.commerce.productDescription(),
    price: tempPrice,
    stock: tempStock,
    images: [
      `${tag}_image_${variantImageIndex}.avif`,
      `${tag}_image_${(variantImageIndex % IMAGES_PER_CATEGORY) + 1}.avif`
    ]
  };
});

    const product = new Product({
      name: productName,
      description: faker.commerce.productDescription(),
      brand: faker.company.name(),
      image: productImage,
      price: productPrice,
      totalStock: productStock,
      sales: faker.number.int({ min: 0, max: 50 }),
      variants,
      tag,
      rating: {
        average: 0,
        totalAmount: 0,
        count: 0,
        fiveStar: 0,
        fourStar: 0,
        threeStar: 0,
        twoStar: 0,
        oneStar: 0
      }
    });

    await product.save();
    allProducts.push(product);
  }

  // Add ratings & comments for each product
  for (const product of allProducts) {
    const ratingCount = faker.number.int({ min: 1, max: 10 });
    let totalRating = 0;
    const ratingSummary = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (let i = 0; i < ratingCount; i++) {
      const stars = faker.number.int({ min: 1, max: 5 });
      ratingSummary[stars]++;
      totalRating += stars;

      const rating = new Rating({
        productId: product._id,
        userId: faker.string.uuid(),
        username: faker.internet.userName(),
        comment: faker.lorem.sentence(),
        rating: stars
      });

      await rating.save();
    }

    const commentCount = faker.number.int({ min: 1, max: 5 });
    for (let j = 0; j < commentCount; j++) {
      const comment = new Comment({
        productId: product._id,
        userId: faker.string.uuid(),
        username: faker.internet.userName(),
        comment: faker.lorem.sentences(2)
      });
      await comment.save();
    }

    product.rating = {
      average: (totalRating / ratingCount).toFixed(1),
      totalAmount: totalRating,
      count: ratingCount,
      oneStar: ratingSummary[1],
      twoStar: ratingSummary[2],
      threeStar: ratingSummary[3],
      fourStar: ratingSummary[4],
      fiveStar: ratingSummary[5]
    };
    await product.save();
  }

  console.log('Seeding complete');
  await mongoose.disconnect();
}

seedDatabase().catch(err => console.error(err));