export const CATEGORIES = ["All", "Electronics", "Home", "Books", "Sports"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Product = {
  id: number;
  name: string;
  category: Exclude<Category, "All">;
  price: number;
};

// 30 products: Electronics 15, Home 7, Books 4, Sports 4.
// "lamp" matches 11 products, 7 of them in Electronics, so lamp + Electronics still paginates.
export const PRODUCTS: Product[] = [
  { id: 1, name: "Smart LED Lamp", category: "Electronics", price: 39 },
  { id: 2, name: "Wireless Earbuds", category: "Electronics", price: 59 },
  { id: 3, name: "USB-C Charger 65W", category: "Electronics", price: 29 },
  { id: 4, name: "LED Desk Lamp", category: "Electronics", price: 45 },
  { id: 5, name: "Bluetooth Speaker", category: "Electronics", price: 49 },
  { id: 6, name: "Clip-on Reading Lamp", category: "Electronics", price: 19 },
  { id: 7, name: "Mechanical Keyboard", category: "Electronics", price: 89 },
  { id: 8, name: "RGB Gaming Lamp", category: "Electronics", price: 35 },
  { id: 9, name: "Webcam 1080p", category: "Electronics", price: 54 },
  { id: 10, name: "UV Nail Lamp", category: "Electronics", price: 25 },
  { id: 11, name: "Portable SSD 1TB", category: "Electronics", price: 99 },
  { id: 12, name: "Wireless Charging Lamp", category: "Electronics", price: 42 },
  { id: 13, name: "Noise-Cancelling Headphones", category: "Electronics", price: 149 },
  { id: 14, name: "Sunrise Alarm Lamp", category: "Electronics", price: 64 },
  { id: 15, name: "Wireless Mouse", category: "Electronics", price: 24 },
  { id: 16, name: "Floor Lamp", category: "Home", price: 79 },
  { id: 17, name: "Ceramic Vase", category: "Home", price: 22 },
  { id: 18, name: "Bedside Lamp", category: "Home", price: 34 },
  { id: 19, name: "Linen Throw Blanket", category: "Home", price: 48 },
  { id: 20, name: "Lava Lamp", category: "Home", price: 27 },
  { id: 21, name: "Scented Candle Set", category: "Home", price: 18 },
  { id: 22, name: "Wall Clock", category: "Home", price: 31 },
  { id: 23, name: "The Pragmatic Programmer", category: "Books", price: 38 },
  { id: 24, name: "Clean Code", category: "Books", price: 33 },
  { id: 25, name: "Designing Data-Intensive Applications", category: "Books", price: 45 },
  { id: 26, name: "Refactoring", category: "Books", price: 41 },
  { id: 27, name: "Yoga Mat", category: "Sports", price: 26 },
  { id: 28, name: "Running Headlamp", category: "Sports", price: 21 },
  { id: 29, name: "Adjustable Dumbbells", category: "Sports", price: 129 },
  { id: 30, name: "Jump Rope", category: "Sports", price: 9 },
];

export const PAGE_SIZE = 5;
