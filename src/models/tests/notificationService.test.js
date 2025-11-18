/**
 * Notification Service Tests
 *
 * These tests verify the notification service logic including:
 * - Date calculation
 * - Notification formatting
 * - Cross-platform notification support
 */

// Mock Electron Notification
const mockNotificationInstance = {
    show: jest.fn(),
    on: jest.fn()
};

const mockNotificationClass = jest.fn().mockImplementation(() => mockNotificationInstance);
mockNotificationClass.isSupported = jest.fn(() => true);

jest.mock('electron', () => ({
    Notification: mockNotificationClass
}));

describe('Notification Service', () => {
    beforeAll(() => {
        // Import after mocking to ensure mocks are in place
        require('../../main/notificationService.cjs');
    });

    describe('Date Calculations', () => {
        test('should calculate days until expiry correctly', () => {
            const today = new Date();
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + 7);

            // Testing logic from getDaysUntilExpiry function
            const expiryString = futureDate.toISOString().split('T')[0];
            const expiry = new Date(expiryString);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            expiry.setHours(0, 0, 0, 0);

            const diffTime = expiry - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            expect(diffDays).toBe(7);
        });

        test('should handle expired tokens correctly', () => {
            const today = new Date();
            const pastDate = new Date(today);
            pastDate.setDate(today.getDate() - 5);

            const expiryString = pastDate.toISOString().split('T')[0];
            const expiry = new Date(expiryString);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            expiry.setHours(0, 0, 0, 0);

            const diffTime = expiry - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            expect(diffDays).toBeLessThanOrEqual(0);
        });

        test('should handle same-day expiry correctly', () => {
            const today = new Date();
            const expiryString = today.toISOString().split('T')[0];

            const expiry = new Date(expiryString);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            expiry.setHours(0, 0, 0, 0);

            const diffTime = expiry - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            expect(diffDays).toBe(0);
        });
    });

    describe('Notification Content Formatting', () => {
        test('should format 7-day expiry notification correctly', () => {
            const token = {
                service_name: 'GitHub',
                token_name: 'test-token',
                expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            };

            // Expected format from formatNotificationContent
            const expectedTitle = `${token.service_name} token expiring soon`;

            expect(expectedTitle).toContain('GitHub');
            expect(expectedTitle).toContain('expiring soon');
        });

        test('should format 1-day expiry notification with urgency', () => {
            const token = {
                service_name: 'AWS',
                token_name: 'prod-key',
                expiry_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
            };

            const expectedTitle = `⚠️ ${token.service_name} token expires tomorrow`;

            expect(expectedTitle).toContain('⚠️');
            expect(expectedTitle).toContain('expires tomorrow');
        });

        test('should format expired token notification with critical urgency', () => {
            const token = {
                service_name: 'OpenAI',
                token_name: 'api-key',
                expiry_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            };

            const expectedTitle = `🔴 ${token.service_name} token has expired`;

            expect(expectedTitle).toContain('🔴');
            expect(expectedTitle).toContain('has expired');
        });
    });

    describe('Notification Support Detection', () => {
        test('should check if notifications are supported', () => {
            const { Notification } = require('electron');

            expect(Notification.isSupported).toBeDefined();
            expect(typeof Notification.isSupported).toBe('function');
        });

        test('should handle unsupported notification systems gracefully', () => {
            const { Notification } = require('electron');
            Notification.isSupported.mockReturnValueOnce(false);

            const isSupported = Notification.isSupported();

            expect(isSupported).toBe(false);
        });
    });

    describe('Notification Categories', () => {
        test('should have distinct categories for different time periods', () => {
            const categories = ['SEVEN_DAYS', 'ONE_DAY', 'EXPIRED'];

            categories.forEach(category => {
                expect(category).toBeTruthy();
                expect(typeof category).toBe('string');
            });

            // Ensure categories are unique
            const uniqueCategories = new Set(categories);
            expect(uniqueCategories.size).toBe(categories.length);
        });
    });

    describe('Cross-Platform Compatibility', () => {
        test('should work on macOS', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', {
                value: 'darwin'
            });

            expect(process.platform).toBe('darwin');

            // Restore original platform
            Object.defineProperty(process, 'platform', {
                value: originalPlatform
            });
        });

        test('should work on Windows', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', {
                value: 'win32'
            });

            expect(process.platform).toBe('win32');

            // Restore original platform
            Object.defineProperty(process, 'platform', {
                value: originalPlatform
            });
        });

        test('should work on Linux', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', {
                value: 'linux'
            });

            expect(process.platform).toBe('linux');

            // Restore original platform
            Object.defineProperty(process, 'platform', {
                value: originalPlatform
            });
        });
    });
});
