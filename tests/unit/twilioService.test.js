// Test script for twilioService.js
// This tests the Twilio implementation of the softphone service

import twilioService from '../../src/services/providers/Twilio/twilioService';
import contactService from '../../src/services/providers/Twilio/contactService';
import agentService from '../../src/services/providers/Twilio/agentService';

// Mock dependencies
jest.mock('../../src/services/providers/Twilio/contactService');
jest.mock('../../src/services/providers/Twilio/agentService');

describe('twilioService', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup global window.Twilio mock
    global.window = {
      Twilio: {
        Device: {
          setup: jest.fn(),
          connect: jest.fn().mockReturnValue({
            on: jest.fn((event, callback) => {
              if (event === 'accept') {
                setTimeout(callback, 10);
              }
              return this;
            }),
            parameters: new Map()
          }),
          on: jest.fn(),
          activeConnection: jest.fn()
        }
      }
    };
    
    // Setup mocks for contactService and agentService
    agentService.initializeAgent.mockResolvedValue({});
    contactService.initializeContact.mockResolvedValue({});
    contactService._setupConnectionEventListeners = jest.fn();
  });

  describe('initialization', () => {
    it('should initialize Twilio service', async () => {
      // Setup
      const options = {
        onStatusChange: jest.fn(),
        onLoginSuccess: jest.fn()
      };
      
      // Test
      await twilioService.initialize(options);
      
      // Verify
      expect(window.Twilio.Device.setup).toHaveBeenCalled();
      expect(agentService.initializeAgent).toHaveBeenCalled();
      expect(contactService.initializeContact).toHaveBeenCalled();
    });
    
    it('should reject if Twilio SDK is not loaded', async () => {
      // Setup
      global.window.Twilio = undefined;
      global.alert = jest.fn();
      
      // Test & Verify
      await expect(twilioService.initialize({})).rejects.toThrow('Twilio SDK not loaded');
      expect(global.alert).toHaveBeenCalledWith('Twilio SDK not loaded.');
    });
  });

  describe('call management', () => {
    it('should place a call', async () => {
      // Test
      const result = await twilioService.placeCall('123456789');
      
      // Verify
      expect(window.Twilio.Device.connect).toHaveBeenCalledWith({
        To: '123456789',
        Direction: 'outbound'
      });
      expect(contactService._setupConnectionEventListeners).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should hang up a call', async () => {
      // Setup
      contactService.endContact.mockResolvedValue(true);
      
      // Test
      const result = await twilioService.hangUpCall();
      
      // Verify
      expect(contactService.endContact).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should hold and resume a call', async () => {
      // Setup
      contactService.holdCall.mockResolvedValue('Call successfully put on hold.');
      contactService.resumeCall.mockResolvedValue('Call successfully resumed.');
      
      // Test
      const holdResult = await twilioService.holdCall();
      const resumeResult = await twilioService.resumeCall();
      
      // Verify
      expect(contactService.holdCall).toHaveBeenCalled();
      expect(contactService.resumeCall).toHaveBeenCalled();
      expect(holdResult).toBe('Call successfully put on hold.');
      expect(resumeResult).toBe('Call successfully resumed.');
    });
  });

  describe('transfer and conference', () => {
    it('should handle cold transfer to a phone number', async () => {
      // Setup
      contactService.transferToPhoneNumber.mockResolvedValue(true);
      
      // Test
      const result = await twilioService.transferCall('123456789', false);
      
      // Verify
      expect(contactService.transferToPhoneNumber).toHaveBeenCalledWith('123456789');
      expect(result).toBe(true);
    });
    
    it('should handle warm transfer to a phone number', async () => {
      // Setup
      contactService.warmTransferToPhoneNumber.mockResolvedValue('conn-123');
      
      // Test
      const result = await twilioService.transferCall('123456789', true);
      
      // Verify
      expect(contactService.warmTransferToPhoneNumber).toHaveBeenCalledWith('123456789');
      expect(result).toBe('conn-123');
    });
    
    it('should handle queue transfers', async () => {
      // Setup
      contactService.transferToQueue.mockResolvedValue(true);
      contactService.warmTransferToQueue.mockResolvedValue('conn-123');
      
      // Test
      const coldResult = await twilioService.transferToQueue('queue1');
      const warmResult = await twilioService.warmTransferToQueue('queue1');
      
      // Verify
      expect(contactService.transferToQueue).toHaveBeenCalledWith('queue1');
      expect(contactService.warmTransferToQueue).toHaveBeenCalledWith('queue1');
      expect(coldResult).toBe(true);
      expect(warmResult).toBe('conn-123');
    });
    
    it('should get available queues', async () => {
      // Test
      const result = await twilioService.getAvailableQueues();
      
      // Verify
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('name', 'Sales Queue');
    });
    
    it('should handle conference calls', async () => {
      // Setup
      contactService.initiateConference.mockResolvedValue('conn-123');
      contactService.mergeConnections.mockResolvedValue(true);
      contactService.removeFromConference.mockResolvedValue(true);
      
      // Test
      const initiateResult = await twilioService.initiateConference('123456789');
      const mergeResult = await twilioService.mergeConnections();
      const removeResult = await twilioService.removeFromConference('conn-123');
      
      // Verify
      expect(contactService.initiateConference).toHaveBeenCalledWith('123456789');
      expect(contactService.mergeConnections).toHaveBeenCalled();
      expect(contactService.removeFromConference).toHaveBeenCalledWith('conn-123');
      expect(initiateResult).toBe('conn-123');
      expect(mergeResult).toBe(true);
      expect(removeResult).toBe(true);
    });
  });

  describe('CRM integration', () => {
    it('should get contact attributes', async () => {
      // Setup
      const mockContactInstance = {
        parameters: new Map([
          ['CallSid', 'call123'],
          ['From', '123456789']
        ]),
        customParameters: {
          dispositionCode: 'resolved'
        }
      };
      contactService.getContactInstance.mockReturnValue(mockContactInstance);
      
      // Test
      const result = await twilioService.getContactAttributes();
      
      // Verify
      expect(result).toHaveProperty('CallSid', 'call123');
      expect(result).toHaveProperty('From', '123456789');
      expect(result).toHaveProperty('dispositionCode', 'resolved');
    });
    
    it('should create a CRM record', async () => {
      // Setup
      const mockContactInstance = {
        parameters: new Map([
          ['CallSid', 'call123']
        ])
      };
      contactService.getContactInstance.mockReturnValue(mockContactInstance);
      agentService.getAgentInstance.mockReturnValue({ sid: 'agent123' });
      
      // Test
      const result = await twilioService.createCrmRecord({}, { name: 'Test Customer' });
      
      // Verify
      expect(result).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('name', 'Test Customer');
      expect(result.data).toHaveProperty('contactId', 'call123');
      expect(result.data).toHaveProperty('agentId', 'agent123');
    });
  });

  describe('simple operations', () => {
    it('should handle incoming calls', async () => {
      // Setup
      contactService.acceptContact.mockResolvedValue(true);
      contactService.declineContact.mockResolvedValue(true);
      
      // Test
      const acceptResult = await twilioService.acceptIncomingCall();
      const declineResult = await twilioService.declineIncomingCall();
      
      // Verify
      expect(contactService.acceptContact).toHaveBeenCalled();
      expect(contactService.declineContact).toHaveBeenCalled();
      expect(acceptResult).toBe(true);
      expect(declineResult).toBe(true);
    });
    
    it('should handle mute operations', async () => {
      // Setup
      agentService.mute.mockResolvedValue(true);
      agentService.unmute.mockResolvedValue(true);
      
      // Test
      const muteResult = await twilioService.muteConnection();
      const unmuteResult = await twilioService.unmuteConnection();
      
      // Verify
      expect(agentService.mute).toHaveBeenCalled();
      expect(agentService.unmute).toHaveBeenCalled();
      expect(muteResult).toBe(true);
      expect(unmuteResult).toBe(true);
    });
    
    it('should handle login', async () => {
      // Setup
      const mockCallbacks = {
        onLoginRequired: jest.fn()
      };
      
      // Set callbacks
      twilioService.initialize(mockCallbacks);
      
      // Test
      const result = await twilioService.openLogin();
      
      // Verify
      expect(mockCallbacks.onLoginRequired).toHaveBeenCalled();
    });
  });
});