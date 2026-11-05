import { jest } from '@jest/globals';

// Mock the models and libraries using unstable_mockModule
//replace a real function, module, or object with a fake version
jest.unstable_mockModule('../models/user.model.js', () => {
    const mockModel = jest.fn();
    mockModel.findOne = jest.fn();
    mockModel.findById = jest.fn();
    return { userModel: mockModel };
});

jest.unstable_mockModule('../models/deliveryMan.model.js', () => ({
    DeliveryManModel: {
        findOne: jest.fn(),
    },
}));

jest.unstable_mockModule('bcryptjs', () => ({
    default: {
        genSalt: jest.fn(),
        hash: jest.fn(),
        compare: jest.fn(),
    },
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
    default: {
        sign: jest.fn(),
    },
}));

// Dynamic imports
//Dynamic imports ensure that the mocks are applied before the modules are imported.

const { 
    register, 
    login, 
    getProfile, 
    forgotPassword, 
    resetPassword, 
    changePassword 
} = await import("../controllers/auth.controller.js");
const { userModel } = await import("../models/user.model.js");
const bcrypt = (await import("bcryptjs")).default;
const jwt = (await import("jsonwebtoken")).default;

describe("Auth Controller", () => {
    let req, res;

    beforeEach(() => {
        req = { body: {}, params: {}, user: {} };
        res = {
            status: jest.fn().mockReturnThis(), //resets calls/implementations on all mocks so tests are isolated
            json: jest.fn(),
        };

        jest.clearAllMocks();
    });

    // --------------------------------------------------------------------
    // REGISTER
    // --------------------------------------------------------------------
    describe("register", () => {
        it("should return 400 when first name is too short", async () => {
            req.body = {
                firstName: "Jo",
                lastName: "Doe",
                email: "test@example.com",
                password: "123456",
                confirmPassword: "123456",
                phone: "01234567890",
                address: "Cairo"
            };

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "First name must be at least 3 characters long" });
        });

        it("should return 400 when passwords do not match", async () => {
            req.body = {
                firstName: "John",
                lastName: "Doe",
                email: "test@example.com",
                password: "123456",
                confirmPassword: "111111",
                phone: "01234567890",
                address: "Cairo"
            };

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Passwords do not match" });
        });

        it("should create a new user successfully", async () => {
            req.body = {
                firstName: "John",
                lastName: "Doe",
                email: "test@example.com",
                password: "123456",
                confirmPassword: "123456",
                phone: "01234567890",
                address: "Cairo"
            };

            bcrypt.genSalt.mockResolvedValue("salt");
            bcrypt.hash.mockResolvedValue("hashedPassword");

            const mockSave = jest.fn().mockResolvedValue({});

            // Mock constructor implementation
            userModel.mockImplementation(() => ({
                save: mockSave
            }));

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ message: "User registered successfully" });
        });
    });

    // --------------------------------------------------------------------
    // LOGIN
    // --------------------------------------------------------------------
    describe("login", () => {
        it("should return 404 if user is not found", async () => {
            req.body = { email: "test@example.com", password: "123456" };

            userModel.findOne.mockResolvedValue(null);

            const { DeliveryManModel } = await import("../models/deliveryMan.model.js");
            DeliveryManModel.findOne.mockResolvedValue(null);

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
        });

        it("should return 400 if password does not match", async () => {
            req.body = { email: "john@example.com", password: "wrongpass" };

            const mockUser = {
                password: "hashedPass"
            };

            userModel.findOne.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
        });

        it("should log in successfully and return token", async () => {
            req.body = { email: "john@example.com", password: "123456" };

            const mockUser = {
                _id: "123",
                role: "user",
                password: "hashedPass",
                _doc: {
                    email: "john@example.com",
                    firstName: "John"
                }
            };

            userModel.findOne.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue("fakeToken");

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                token: "fakeToken",
                user: { email: "john@example.com", firstName: "John" }
            });
        });
    });

    // --------------------------------------------------------------------
    // GET PROFILE
    // --------------------------------------------------------------------
    describe("getProfile", () => {
        it("should return 404 if user not found", async () => {
            req.user.id = "123";

            userModel.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(null)
            });

            await getProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
        });

        it("should return the user profile successfully", async () => {
            req.user.id = "123";

            const mockUser = {
                _id: "123",
                firstName: "John",
                email: "john@example.com"
            };

            userModel.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            await getProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockUser);
        });
    });

    // --------------------------------------------------------------------
    // FORGOT PASSWORD
    // --------------------------------------------------------------------
    describe("forgotPassword", () => {
        it("should return 400 when email is missing", async () => {
            req.body = { email: "" };

            await forgotPassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Please enter your email address" });
        });

        it("should return 404 when user is not found", async () => {
            req.body = { email: "nonexistent@example.com" };
            userModel.findOne.mockReturnValue(null);

            const { DeliveryManModel } = await import("../models/deliveryMan.model.js");
            DeliveryManModel.findOne.mockReturnValue(null);

            await forgotPassword(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it("should generate a reset code and save on user", async () => {
            req.body = { email: "john@example.com" };
            const mockSave = jest.fn().mockResolvedValue({});
            const mockUser = {
                email: "john@example.com",
                save: mockSave
            };

            userModel.findOne.mockReturnValue(mockUser);

            await forgotPassword(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(mockSave).toHaveBeenCalled();
            expect(mockUser.resetPasswordToken).toBeDefined();
            expect(mockUser.resetPasswordExpires).toBeDefined();
        });
    });

    // --------------------------------------------------------------------
    // RESET PASSWORD
    // --------------------------------------------------------------------
    describe("resetPassword", () => {
        it("should return 400 when code or password is missing", async () => {
            req.body = { email: "john@example.com", resetCode: "", newPassword: "" };

            await resetPassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("should return 400 when passwords do not match", async () => {
            req.body = { 
                email: "john@example.com", 
                resetCode: "123456", 
                newPassword: "password123", 
                confirmPassword: "password456" 
            };

            await resetPassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Passwords do not match" });
        });

        it("should successfully reset password with valid code", async () => {
            req.body = { 
                email: "john@example.com", 
                resetCode: "123456", 
                newPassword: "newsecretpassword", 
                confirmPassword: "newsecretpassword" 
            };

            const mockSave = jest.fn().mockResolvedValue({});
            const mockUser = {
                email: "john@example.com",
                resetPasswordToken: "123456",
                resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000),
                save: mockSave
            };

            userModel.findOne.mockResolvedValue(mockUser);
            bcrypt.genSalt.mockResolvedValue("salt");
            bcrypt.hash.mockResolvedValue("newHashedPassword");

            await resetPassword(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(mockUser.password).toBe("newHashedPassword");
            expect(mockUser.resetPasswordToken).toBeNull();
            expect(mockSave).toHaveBeenCalled();
        });
    });

    // --------------------------------------------------------------------
    // CHANGE PASSWORD
    // --------------------------------------------------------------------
    describe("changePassword", () => {
        it("should return 400 when current or new password is missing", async () => {
            req.user = { id: "123" };
            req.body = { currentPassword: "", newPassword: "" };

            await changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("should return 400 when current password is incorrect", async () => {
            req.user = { id: "123" };
            req.body = { 
                currentPassword: "wrongcurrent", 
                newPassword: "newpassword123", 
                confirmPassword: "newpassword123" 
            };

            const mockUser = {
                _id: "123",
                password: "hashedPassword"
            };

            userModel.findById.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);

            await changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Current password is incorrect. Please try again." });
        });

        it("should successfully change password when current password matches", async () => {
            req.user = { id: "123" };
            req.body = { 
                currentPassword: "correctcurrent", 
                newPassword: "brandnewpassword123", 
                confirmPassword: "brandnewpassword123" 
            };

            const mockSave = jest.fn().mockResolvedValue({});
            const mockUser = {
                _id: "123",
                password: "hashedOldPassword",
                save: mockSave
            };

            userModel.findById.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            bcrypt.genSalt.mockResolvedValue("salt");
            bcrypt.hash.mockResolvedValue("brandNewHashedPassword");

            await changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(mockUser.password).toBe("brandNewHashedPassword");
            expect(mockSave).toHaveBeenCalled();
        });
    });
});
