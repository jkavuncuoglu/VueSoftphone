// Test script for amazonConnectService.js
// This is a simple test to verify that the optimized code works as expected

import amazonConnectService from '../../src/services/providers/AmazonConnect/amazonConnectService';
import contactService from '../../src/services/providers/AmazonConnect/contactService';
import agentService from '../../src/services/providers/AmazonConnect/agentService';

// Mock dependencies
jest.mock('../../src/services/providers/AmazonConnect/contactService');
jest.mock('../../src/services/providers/AmazonConnect/agentService');

describe('amazonConnectService', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup global window.connect mock
    global.window = {
      connect: {
        core: {
          initCCP: jest.fn(),
          getQueues: jest.fn()
        },
        Endpoint: {
          byPhoneNumber: jest.fn().mockReturnValue({ endpoint: 'phone' }),
          byQueueId: jest.fn().mockReturnValue({ endpoint: 'queue' })
        },
        contact: jest.fn()
      }
    };
    
    // Mock document.getElementById
    document.getElementById = jest.fn().mockReturnValue({
      click: jest.fn()
    });
    
    // Mock process.env
    process.env.MIX_AWS_CONNECT_URL = 'test.awsapps.com';
  });

  describe('holdCall and resumeCall', () => {
    it('should call contactService methods and return their promises', async () => {
      // Setup
      contactService.holdCall.mockResolvedValue(true);
      contactService.resumeCall.mockResolvedValue(true);
      
      // Test
      const holdResult = await amazonConnectService.holdCall();
      const resumeResult = await amazonConnectService.resumeCall();
      
      // Verify
      expect(contactService.holdCall).toHaveBeenCalled();
      expect(contactService.resumeCall).toHaveBeenCalled();
      expect(holdResult).toBe(true);
      expect(resumeResult).toBe(true);
    });
  });

  describe('transferCall', () => {
    it('should handle warm transfers correctly', async () => {
      // Setup
      const mockContactInstance = {
        addConnection: jest.fn((endpoint, callbacks) => {
          callbacks.success();
        }),
        toggleActiveConnections: jest.fn()
      };
      contactService.getContactInstance.mockReturnValue(mockContactInstance);
      
      // Test
      const result = await amazonConnectService.transferCall('123456789', true);
      
      // Verify
      expect(window.connect.Endpoint.byPhoneNumber).toHaveBeenCalledWith('123456789');
      expect(mockContactInstance.addConnection).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should handle cold transfers correctly', async () => {
      // Setup
      const mockContactInstance = {
        addConnection: jest.fn(),
        toggleActiveConnections: jest.fn((endpoint, callbacks) => {
          callbacks.success();
        })
      };
      contactService.getContactInstance.mockReturnValue(mockContactInstance);
      
      // Test
      const result = await amazonConnectService.transferCall('123456789', false);
      
      // Verify
      expect(window.connect.Endpoint.byPhoneNumber).toHaveBeenCalledWith('123456789');
      expect(mockContactInstance.toggleActiveConnections).toHaveBeenCalled();
      expect(result).toBe(false);
    });
    
    it('should reject if no contact instance is available', async () => {
      // Setup
      contactService.getContactInstance.mockReturnValue(null);
      
      // Test & Verify
      await expect(amazonConnectService.transferCall('123456789')).rejects.toThrow(
        'No active contact available for transfer.'
      );
    });
  });

  describe('simple functions', () => {
    it('should return promises for simple operations', async () => {
      // Test
      const acceptResult = await amazonConnectService.acceptIncomingCall();
      const declineResult = await amazonConnectService.declineIncomingCall();
      const muteResult = await amazonConnectService.muteConnection();
      const unmuteResult = await amazonConnectService.unmuteConnection();
      const loginResult = await amazonConnectService.openLogin();
      
      // Verify
      expect(contactService.acceptContact).toHaveBeenCalled();
      expect(contactService.declineContact).toHaveBeenCalled();
      expect(agentService.mute).toHaveBeenCalled();
      expect(agentService.unmute).toHaveBeenCalled();
      expect(document.getElementById).toHaveBeenCalledWith('ccpContainer');
    });
  });
});