import { describe, jest, it, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../models/notification.model.js', () => {
    const mockModel = jest.fn();
    mockModel.find = jest.fn();
    mockModel.countDocuments = jest.fn();
    mockModel.findOneAndUpdate = jest.fn();
    mockModel.updateMany = jest.fn();
    mockModel.findOneAndDelete = jest.fn();
    mockModel.create = jest.fn();
    return { NotificationModel: mockModel };
});

const {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    sendInAppNotification,
} = await import('../controllers/notification.controller.js');
const { NotificationModel } = await import('../models/notification.model.js');

describe('Notification Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            query: {},
            user: { id: 'user123', _id: 'user123' },
            app: { get: jest.fn() },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        jest.clearAllMocks();
    });

    describe('getUserNotifications', () => {
        it('should fetch user notifications and unread count', async () => {
            const mockChain = {
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([{ title: 'Test Alert', isRead: false }]),
            };
            NotificationModel.find.mockReturnValue(mockChain);
            NotificationModel.countDocuments.mockResolvedValue(1);

            await getUserNotifications(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    unreadCount: 1,
                    notifications: expect.any(Array),
                })
            );
        });
    });

    describe('markNotificationAsRead', () => {
        it('should mark single notification as read', async () => {
            req.params.id = 'notif123';
            NotificationModel.findOneAndUpdate.mockResolvedValue({ _id: 'notif123', isRead: true });
            NotificationModel.countDocuments.mockResolvedValue(0);

            await markNotificationAsRead(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    unreadCount: 0,
                })
            );
        });

        it('should return 404 if notification not found', async () => {
            req.params.id = 'notif_missing';
            NotificationModel.findOneAndUpdate.mockResolvedValue(null);

            await markNotificationAsRead(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('markAllNotificationsAsRead', () => {
        it('should mark all notifications as read', async () => {
            NotificationModel.updateMany.mockResolvedValue({ modifiedCount: 3 });

            await markAllNotificationsAsRead(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    unreadCount: 0,
                })
            );
        });
    });

    describe('deleteNotification', () => {
        it('should delete notification successfully', async () => {
            req.params.id = 'notif123';
            NotificationModel.findOneAndDelete.mockResolvedValue({ _id: 'notif123' });
            NotificationModel.countDocuments.mockResolvedValue(0);

            await deleteNotification(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: "Notification deleted",
                })
            );
        });
    });

    describe('sendInAppNotification helper', () => {
        it('should create notification and broadcast to socket room', async () => {
            const mockIo = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            };
            NotificationModel.create.mockResolvedValue({ _id: 'new_notif', title: 'Order Ready' });

            const result = await sendInAppNotification({
                userId: 'user123',
                title: 'Order Ready',
                message: 'Your food is cooked!',
                io: mockIo,
            });

            expect(result).toBeDefined();
            expect(mockIo.to).toHaveBeenCalledWith('user-user123');
        });
    });
});
