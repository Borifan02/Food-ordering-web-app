import "dotenv/config";
import bcrypt from "bcryptjs";
import { categoryModel } from "./models/category.model.js";
import { ItemModel } from "./models/menuItem.model.js";
import { userModel } from "./models/user.model.js";
import { DeliveryManModel } from "./models/deliveryMan.model.js";
import { CouponModel } from "./models/coupon.model.js";
import { OrderModel } from "./models/order.model.js";
import dbConnection from "./models/db.connection.js";
import logger from "./utils/logger.js";

const seedData = async () => {
  try {
    await dbConnection();
    logger.info("Connected to database for seeding...");

    // 1. Clear existing sample collections
    await categoryModel.deleteMany({});
    await ItemModel.deleteMany({});
    await userModel.deleteMany({ email: { $in: ["admin@foodie.com", "user@foodie.com"] } });
    await DeliveryManModel.deleteMany({ email: "delivery@foodie.com" });
    await CouponModel.deleteMany({});

    // 2. Hash default passwords
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash("admin123", salt);
    const userPassword = await bcrypt.hash("user123", salt);
    const deliveryPassword = await bcrypt.hash("delivery123", salt);

    // 3. Create Demo Users
    const adminUser = await userModel.create({
      firstName: "Admin",
      lastName: "Manager",
      email: "admin@foodie.com",
      password: adminPassword,
      role: "admin",
      phone: "01234567890",
      address: "HQ Foodie Central, 100 Chef Way",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
    });

    const customerUser = await userModel.create({
      firstName: "Sarah",
      lastName: "Jenkins",
      email: "user@foodie.com",
      password: userPassword,
      role: "user",
      phone: "01987654321",
      address: "742 Evergreen Terrace, Apt 4B",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
    });

    const deliveryPartner = await DeliveryManModel.create({
      name: "Alex Martinez",
      phone: "01122334455",
      email: "delivery@foodie.com",
      password: deliveryPassword,
      role: "deliveryMan",
      status: "available",
      vehicleType: "Scooter",
      rating: 4.95,
      totalDeliveries: 42
    });

    logger.info("Demo accounts seeded successfully:");
    logger.info(" - Admin: admin@foodie.com / admin123");
    logger.info(" - Customer: user@foodie.com / user123");
    logger.info(" - Delivery Driver: delivery@foodie.com / delivery123");

    // 4. Create Coupons
    await CouponModel.insertMany([
      {
        code: "WELCOME10",
        discountPercent: 10,
        minOrderAmount: 0,
        maxDiscount: 20,
        description: "10% off your entire meal",
        isActive: true
      },
      {
        code: "TASTY20",
        discountPercent: 20,
        minOrderAmount: 20,
        maxDiscount: 35,
        description: "20% off orders over $20",
        isActive: true
      },
      {
        code: "FREESHIP",
        discountAmount: 3.99,
        minOrderAmount: 15,
        description: "Free delivery on orders over $15",
        isActive: true
      }
    ]);

    // 5. Create Categories
    const categories = await categoryModel.insertMany([
      {
        name: "Pizza",
        image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
        isActive: true
      },
      {
        name: "Burgers",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
        isActive: true
      },
      {
        name: "Pasta & Bowls",
        image: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400",
        isActive: true
      },
      {
        name: "Asian & Sushi",
        image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400",
        isActive: true
      },
      {
        name: "Desserts",
        image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400",
        isActive: true
      },
      {
        name: "Beverages",
        image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400",
        isActive: true
      }
    ]);

    // 6. Create Menu Items with rich attributes
    const menuItems = [
      {
        name: "Artisan Margherita Pizza",
        description: "San Marzano tomato sauce, fresh buffalo mozzarella, fragrant basil leaves, and cold-pressed extra virgin olive oil.",
        price: 13.99,
        categoryId: categories[0]._id,
        image: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600",
        tags: ["Vegetarian", "Popular", "ChefSpecial"],
        prepTime: "15-20 min",
        calories: 680,
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Double Smoky Pepperoni Pizza",
        description: "Crispy-edged cups of spicy pepperoni layered over melted whole-milk mozzarella and herb tomato puree.",
        price: 15.99,
        categoryId: categories[0]._id,
        image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600",
        tags: ["Spicy", "Popular"],
        prepTime: "15-20 min",
        calories: 790,
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Truffle Mushroom Pizza",
        description: "Roasted wild cremini mushrooms, white truffle cream drizzle, goat cheese, thyme, and baby arugula.",
        price: 16.99,
        categoryId: categories[0]._id,
        image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600",
        tags: ["Vegetarian", "ChefSpecial"],
        prepTime: "18-22 min",
        calories: 640,
        isFeatured: false,
        isAvailable: true
      },
      {
        name: "Smash Prime Cheeseburger",
        description: "Double Angus beef patties smashed with caramelized onions, aged cheddar, tangy pickles, and secret house sauce on a brioche bun.",
        price: 12.99,
        categoryId: categories[1]._id,
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600",
        tags: ["Popular", "ChefSpecial"],
        prepTime: "12-15 min",
        calories: 820,
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Crispy Nashville Hot Chicken Burger",
        description: "Buttermilk fried chicken breast dipped in Nashville hot cayenne chili oil, coleslaw, and dill pickles.",
        price: 13.49,
        categoryId: categories[1]._id,
        image: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=600",
        tags: ["Spicy", "Popular"],
        prepTime: "15-18 min",
        calories: 740,
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Avocado Garden Veggie Burger",
        description: "Black bean & quinoa patty topped with sliced avocado, crisp sprouts, heirloom tomatoes, and vegan garlic aioli.",
        price: 11.99,
        categoryId: categories[1]._id,
        image: "https://images.unsplash.com/photo-1520072959219-c595dc870360?w=600",
        tags: ["Vegetarian", "Healthy"],
        prepTime: "12-16 min",
        calories: 520,
        isFeatured: false,
        isAvailable: true
      },
      {
        name: "Creamy Fettuccine Alfredo with Chicken",
        description: "Al dente egg fettuccine tossed in a rich parmesan butter cream sauce, topped with grilled herb chicken breast and cracked pepper.",
        price: 14.99,
        categoryId: categories[2]._id,
        image: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600",
        tags: ["ChefSpecial", "Popular"],
        prepTime: "18-22 min",
        calories: 890,
        isFeatured: false,
        isAvailable: true
      },
      {
        name: "Slow-Cooked Bolognese Tagliatelle",
        description: "Traditional Italian ragù simmered with ground beef, pork, mirepoix, Chianti wine, and freshly grated Pecorino Romano.",
        price: 15.49,
        categoryId: categories[2]._id,
        image: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=600",
        tags: ["Popular"],
        prepTime: "15-20 min",
        calories: 750,
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Tokyo Dragon Sushi Roll (8 pcs)",
        description: "Shrimp tempura and cucumber wrapped with unagi eel, sliced avocado, toasted sesame, and sweet kabayaki sauce.",
        price: 14.99,
        categoryId: categories[3]._id,
        image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600",
        tags: ["ChefSpecial", "Popular"],
        prepTime: "15-20 min",
        calories: 510,
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Spicy Salmon Poke Bowl",
        description: "Fresh sashimi-grade Atlantic salmon, edamame, seaweed salad, mango cubes, sushi rice, and spicy sriracha mayo.",
        price: 15.99,
        categoryId: categories[3]._id,
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
        tags: ["Spicy", "Healthy", "ChefSpecial"],
        prepTime: "12-15 min",
        calories: 560,
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Molten Lava Chocolate Cake",
        description: "Warm Belgian dark chocolate cake with a gooey liquid chocolate center, served with vanilla bean cream.",
        price: 7.99,
        categoryId: categories[4]._id,
        image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600",
        tags: ["Dessert", "Popular"],
        prepTime: "10-12 min",
        calories: 590,
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Classic Italian Tiramisu",
        description: "Espresso-soaked savoiardi ladyfingers layered with velvety mascarpone zabaglione and dusted with Dutch cocoa powder.",
        price: 6.99,
        categoryId: categories[4]._id,
        image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600",
        tags: ["Dessert"],
        prepTime: "5 min",
        calories: 460,
        isFeatured: false,
        isAvailable: true
      },
      {
        name: "Fresh Strawberry Mint Lemonade",
        description: "Muddled California strawberries, fresh squeezed lemons, garden mint sprigs, and chilled sparkling soda.",
        price: 4.49,
        categoryId: categories[5]._id,
        image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600",
        tags: ["Beverage", "Healthy"],
        prepTime: "5 min",
        calories: 120,
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Iced Caramel Macchiato",
        description: "Double shot of rich espresso poured over cold whole milk, vanilla syrup, and drizzled with buttery salted caramel.",
        price: 4.99,
        categoryId: categories[5]._id,
        image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600",
        tags: ["Beverage"],
        prepTime: "5 min",
        calories: 210,
        isFeatured: false,
        isAvailable: true
      }
    ];

    const insertedItems = await ItemModel.insertMany(menuItems);
    logger.info(`Inserted ${insertedItems.length} menu items across ${categories.length} categories.`);

    // 7. Create a Sample Active Order for Sarah
    await OrderModel.create({
      userId: customerUser._id,
      items: [
        {
          menuItemId: insertedItems[0]._id,
          name: insertedItems[0].name,
          price: insertedItems[0].price,
          quantity: 1
        },
        {
          name: insertedItems[3].name,
          menuItemId: insertedItems[3]._id,
          price: insertedItems[3].price,
          quantity: 2
        }
      ],
      subtotal: insertedItems[0].price + (insertedItems[3].price * 2),
      deliveryFee: 0,
      discountAmount: 0,
      totalAmount: insertedItems[0].price + (insertedItems[3].price * 2),
      deliveryAddress: customerUser.address,
      orderNotes: "Please leave on porch table and ring the bell.",
      payment: {
        method: "Cash",
        status: "Pending"
      },
      status: "Preparing",
      timeline: [
        {
          status: "pending",
          timestamp: new Date(Date.now() - 20 * 60 * 1000),
          note: "Order confirmed by customer"
        },
        {
          status: "Preparing",
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          note: "Chef is baking and preparing items in kitchen"
        }
      ]
    });

    logger.info("Sample active order created for demo testing.");
    logger.info("Database seeding completed successfully! ✨");
    process.exit(0);
  } catch (error) {
    logger.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedData();
