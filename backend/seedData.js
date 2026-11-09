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
        name: "Traditional Ethiopian",
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
        isActive: true
      },
      {
        name: "Fasting & Vegan (የፆም)",
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400",
        isActive: true
      },
      {
        name: "Burgers & Sandwiches",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
        isActive: true
      },
      {
        name: "Pizza & Italian",
        image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
        isActive: true
      },
      {
        name: "Desserts & Beverages",
        image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400",
        isActive: true
      }
    ]);

    // 6. Create Menu Items with rich Ethiopian & international attributes
    const menuItems = [
      {
        name: "Special Doro Wat (የዶሮ ወጥ)",
        description: "Classic tender chicken drumstick slow-cooked in rich berbere sauce with hard-boiled egg and injera.",
        price: 380,
        categoryId: categories[0]._id,
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
        tags: ["Traditional", "Spicy", "ChefSpecial", "Popular"],
        prepTime: "25-35 min",
        calories: 720,
        dietaryType: "non-fasting",
        spiceLevel: "hot",
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Kitfo Special with Kocho & Ayib",
        description: "Finely minced prime Ethiopian lean beef seasoned with clarified niter kibbeh butter and spicy mitmita.",
        price: 420,
        categoryId: categories[0]._id,
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600",
        tags: ["Traditional", "ChefSpecial", "Popular"],
        prepTime: "15-20 min",
        calories: 840,
        dietaryType: "non-fasting",
        spiceLevel: "medium",
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Special Beef Tibs with Rosemary & Awaze",
        description: "Tender cubed beef sautéed on high heat with onions, sliced green jalapeño peppers, garlic, and fresh rosemary.",
        price: 320,
        categoryId: categories[0]._id,
        image: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600",
        tags: ["Traditional", "Popular"],
        prepTime: "15-20 min",
        calories: 650,
        dietaryType: "non-fasting",
        spiceLevel: "mild",
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Beyaynetu Ultimate Fasting Platter (የፆም በያይነቱ)",
        description: "Abundant vegan platter: Shiro, spicy red Misir Wat, yellow Kik Alicha, steamed Gomen, and cabbage over freshly baked Injera.",
        price: 210,
        categoryId: categories[1]._id,
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600",
        tags: ["Fasting", "Vegan", "Healthy", "Popular"],
        prepTime: "10-15 min",
        calories: 520,
        dietaryType: "fasting",
        spiceLevel: "medium",
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Shiro Tegabino in Clay Pot (ሽሮ ተጋቢኖ)",
        description: "Bubbling savory spiced chickpea stew cooked in a traditional clay pot with garlic and aromatic Ethiopian herbs.",
        price: 145,
        categoryId: categories[1]._id,
        image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600",
        tags: ["Fasting", "Vegan", "ComfortFood"],
        prepTime: "12-15 min",
        calories: 460,
        dietaryType: "fasting",
        spiceLevel: "mild",
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Misir Wat (Spicy Red Lentils)",
        description: "Split red lentils simmered gently in rich berbere red pepper sauce with garlic and ginger.",
        price: 130,
        categoryId: categories[1]._id,
        image: "https://images.unsplash.com/photo-1546069901-d07b38d39e33?w=600",
        tags: ["Fasting", "Vegan", "Spicy"],
        prepTime: "10-15 min",
        calories: 410,
        dietaryType: "fasting",
        spiceLevel: "hot",
        isFeatured: false,
        isAvailable: true
      },
      {
        name: "Smash Prime Cheeseburger",
        description: "Double beef patties smashed with caramelized onions, aged cheddar, tangy pickles, and house burger sauce.",
        price: 220,
        categoryId: categories[2]._id,
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600",
        tags: ["Popular"],
        prepTime: "12-15 min",
        calories: 820,
        dietaryType: "non-fasting",
        spiceLevel: "mild",
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Crispy Hot Chicken Burger",
        description: "Buttermilk-marinated crispy chicken breast with spicy cayenne mayo, crisp coleslaw, and pickles.",
        price: 230,
        categoryId: categories[2]._id,
        image: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=600",
        tags: ["Spicy", "Popular"],
        prepTime: "15-18 min",
        calories: 740,
        dietaryType: "non-fasting",
        spiceLevel: "hot",
        isFeatured: false,
        isAvailable: true
      },
      {
        name: "Artisan Margherita Pizza",
        description: "San Marzano tomato sauce, fresh buffalo mozzarella, aromatic basil leaves, and extra virgin olive oil.",
        price: 240,
        categoryId: categories[3]._id,
        image: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600",
        tags: ["Vegetarian", "Popular"],
        prepTime: "15-20 min",
        calories: 680,
        dietaryType: "all",
        spiceLevel: "mild",
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Traditional Buna / Ethiopian Coffee Ceremony",
        description: "Freshly roasted and brewed single-origin Ethiopian Arabica coffee served traditionally with burning frankincense.",
        price: 60,
        categoryId: categories[4]._id,
        image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600",
        tags: ["Traditional", "Beverage", "Popular"],
        prepTime: "5-10 min",
        calories: 5,
        dietaryType: "fasting",
        spiceLevel: "mild",
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Fresh Strawberry Mint Lemonade",
        description: "Fresh squeezed lemons with muddled wild strawberries, garden mint, and chilled sparkling soda.",
        price: 75,
        categoryId: categories[4]._id,
        image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600",
        tags: ["Beverage", "Healthy"],
        prepTime: "5 min",
        calories: 120,
        dietaryType: "fasting",
        spiceLevel: "mild",
        isFeatured: true,
        isAvailable: true
      },
      {
        name: "Classic Italian Tiramisu",
        description: "Savoiardi ladyfingers soaked in espresso, layered with rich mascarpone zabaglione and Dutch cocoa powder.",
        price: 110,
        categoryId: categories[4]._id,
        image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600",
        tags: ["Dessert"],
        prepTime: "5 min",
        calories: 460,
        dietaryType: "all",
        spiceLevel: "mild",
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

import { fileURLToPath } from "url";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedData();
}

export default seedData;
