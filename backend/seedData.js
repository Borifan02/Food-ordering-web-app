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
      { name: "Pizza", image: "/uploads/pizza.jpg" },
      { name: "Burgers", image: "/uploads/burger.jpg" },
      { name: "Pasta", image: "/uploads/pasta.jpg" },
      { name: "Desserts", image: "/uploads/dessert.jpg" },
      { name: "Beverages", image: "/uploads/drinks.jpg" }
    ]);
    
    // Create menu items
    const menuItems = [
      {
        name: "Margherita Pizza",
        description: "Classic pizza with tomato sauce, mozzarella, and fresh basil",
        price: 12.99,
        categoryId: categories[0]._id,
        image: "/uploads/margherita.jpg"
      },
      {
        name: "Pepperoni Pizza",
        description: "Traditional pizza topped with pepperoni and mozzarella cheese",
        price: 14.99,
        categoryId: categories[0]._id,
        image: "/uploads/pepperoni.jpg"
      },
      {
        name: "Classic Cheeseburger",
        description: "Juicy beef patty with cheese, lettuce, tomato, and special sauce",
        price: 10.99,
        categoryId: categories[1]._id,
        image: "/uploads/cheeseburger.jpg"
      },
      {
        name: "Chicken Burger",
        description: "Grilled chicken breast with fresh vegetables and mayo",
        price: 11.99,
        categoryId: categories[1]._id,
        image: "/uploads/chicken-burger.jpg"
      },
      {
        name: "Spaghetti Carbonara",
        description: "Creamy pasta with bacon, eggs, and parmesan cheese",
        price: 13.99,
        categoryId: categories[2]._id,
        image: "/uploads/carbonara.jpg"
      },
      {
        name: "Chocolate Cake",
        description: "Rich chocolate cake with chocolate frosting",
        price: 6.99,
        categoryId: categories[3]._id,
        image: "/uploads/chocolate-cake.jpg"
      },
      {
        name: "Coca Cola",
        description: "Refreshing cola drink",
        price: 2.99,
        categoryId: categories[4]._id,
        image: "/uploads/cola.jpg"
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