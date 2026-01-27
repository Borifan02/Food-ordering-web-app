import "dotenv/config";
import { categoryModel } from "./models/category.model.js";
import { ItemModel } from "./models/menuItem.model.js";
import dbConnection from "./models/db.connection.js";

const seedData = async () => {
  try {
    await dbConnection();
    
    // Clear existing data
    await categoryModel.deleteMany({});
    await ItemModel.deleteMany({});
    
    // Create categories
    const categories = await categoryModel.insertMany([
      { name: "Pizza", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300" },
      { name: "Burgers", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300" },
      { name: "Pasta", image: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=300" },
      { name: "Desserts", image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=300" },
      { name: "Beverages", image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300" }
    ]);
    
    // Create menu items with real images
    const menuItems = [
      {
        name: "Margherita Pizza",
        description: "Classic pizza with tomato sauce, mozzarella, and fresh basil",
        price: 12.99,
        categoryId: categories[0]._id,
        image: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400"
      },
      {
        name: "Pepperoni Pizza",
        description: "Traditional pizza topped with pepperoni and mozzarella cheese",
        price: 14.99,
        categoryId: categories[0]._id,
        image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400"
      },
      {
        name: "Classic Cheeseburger",
        description: "Juicy beef patty with cheese, lettuce, tomato, and special sauce",
        price: 10.99,
        categoryId: categories[1]._id,
        image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400"
      },
      {
        name: "Chicken Burger",
        description: "Grilled chicken breast with fresh vegetables and mayo",
        price: 11.99,
        categoryId: categories[1]._id,
        image: "https://images.unsplash.com/photo-1606755962773-d324e2dabd3f?w=400"
      },
      {
        name: "Spaghetti Carbonara",
        description: "Creamy pasta with bacon, eggs, and parmesan cheese",
        price: 13.99,
        categoryId: categories[2]._id,
        image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400"
      },
      {
        name: "Chocolate Cake",
        description: "Rich chocolate cake with chocolate frosting",
        price: 6.99,
        categoryId: categories[3]._id,
        image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400"
      },
      {
        name: "Coca Cola",
        description: "Refreshing cola drink",
        price: 2.99,
        categoryId: categories[4]._id,
        image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400"
      }
    ];
    
    await ItemModel.insertMany(menuItems);
    
    console.log("Sample data seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedData();