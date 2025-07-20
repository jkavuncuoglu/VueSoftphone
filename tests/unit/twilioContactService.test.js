// Test script for Twilio contactService.js
// This tests the Twilio implementation of the contact service

import contactService from '../../src/services/providers/Twilio/contactService';
import agentService from '../../src/services/providers/Twilio/agentService';

// Mock dependencies
jest.mock('../../src/services/providers/Twilio/agentService');

describe('Twilio contactService', () => {
  let mockConnection;
  let mockDevice;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock connection
    mockConnection = {
      accept: jest.fn(),
      reject: jest.fn(),
      disconnect: jest.fn(),
      sendDigits: jest.fn(),
      parameters: new Map([
        ['CallSid', 'call123'],
        ['From', '123456789']
      ]),
      customParameters: {},
      on: jest.fn()
    };
    
    // Setup mock Twilio Device
    mockDevice = {
      on: jest.fn(),
      connect: jest.fn().mockReturnValue(mockConnection)
    };
    
    // Setup global window.Twilio mock
    global.window = {
      Twilio: {
        Device: mockDevice
      }
    };
    
    // Setup mock agent instance
    const mockAgentInstance = {
      sid: 'worker123',
      attributes: {
        extension: '1234'
      },
      workspace: {
        activities: {
          'act1': { sid: 'act1', friendlyName: 'Available' },
          'act2': { sid: 'act2', friendlyName: 'AfterCallWork' }
        }
      },
      updateActivity: jest.fn((activitySid, callbacks) => callbacks.success())
    };
    
    agentService.getAgentInstance.mockReturnValue(mockAgentInstance);
    agentService.getAgentState.mockReturnValue('Available');
    
    // Set the mock contact instance
    Object.defineProperty(contactService, 'getContactInstance', {
      value: jest.fn().mockReturnValue(mockConnection)
    });
  });
  
  describe('initialization', () => {
    it('should initialize the contact service', async () => {
      // Setup
      const callbacks = {
        onIncomingCall: jest.fn(),
        onConnected: jest.fn()
      };
      
      // Test
      await contactService.initializeContact(callbacks);
      
      // Verify
      expect(window.Twilio.Device.on).toHaveBeenCalledWith('incoming', expect.any(Function));
    });
    
    it('should reject if Twilio Voice SDK is not loaded', async () => {
      // Setup
      global.window.Twilio.Device = undefined;
      
      // Test & Verify
      await expect(contactService.initializeContact({})).rejects.toThrow('Twilio Voice SDK not loaded');
    });
  });
  
  describe('basic call handling', () => {
    it('should accept an incoming call', async () => {
      // Test
      const result = await contactService.acceptContact();
      
      // Verify
      expect(mockConnection.accept).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should decline an incoming call', async () => {
      // Test
      const result = await contactService.declineContact();
      
      // Verify
      expect(mockConnection.reject).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should end a contact', async () => {
      // Test
      const result = await contactService.endContact();
      
      // Verify
      expect(mockConnection.disconnect).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should hold a call', async () => {
      // Test
      const result = await contactService.holdCall();
      
      // Verify
      expect(mockConnection.sendDigits).toHaveBeenCalledWith('*1');
      expect(result).toBe('Call successfully put on hold.');
    });
    
    it('should resume a call', async () => {
      // Test
      const result = await contactService.resumeCall();
      
      // Verify
      expect(mockConnection.sendDigits).toHaveBeenCalledWith('*2');
      expect(result).toBe('Call successfully resumed.');
    });
  });
  
  describe('disposition codes', () => {
    it('should get disposition codes', () => {
      // Test
      const codes = contactService.getDispositionCodes();
      
      // Verify
      expect(codes).toHaveLength(8);
      expect(codes[0]).toHaveProperty('id', 'resolved');
      expect(codes[0]).toHaveProperty('label', 'Issue Resolved');
    });
    
    it('should set a disposition code', async () => {
      // Test
      const result = await contactService.setDispositionCode('resolved', 'Test notes');
      
      // Verify
      expect(mockConnection.customParameters).toHaveProperty('dispositionCode', 'resolved');
      expect(mockConnection.customParameters).toHaveProperty('dispositionNotes', 'Test notes');
      expect(result).toBe(true);
    });
  });
  
  describe('after call work', () => {
    it('should enter after call work mode', async () => {
      // Test
      const result = await contactService.enterAfterCallWork();
      
      // Verify
      expect(agentService.getAgentInstance().updateActivity).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should complete after call work', async () => {
      // Test
      const result = await contactService.completeAfterCallWork('resolved', 'Test notes');
      
      // Verify
      expect(mockConnection.customParameters).toHaveProperty('dispositionCode', 'resolved');
      expect(agentService.getAgentInstance().updateActivity).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should get after call work remaining time', () => {
      // Setup
      agentService.getAgentState.mockReturnValue('AfterCallWork');
      agentService.getAgentInstance().attributes.acwStartTime = Date.now() - 60000; // 1 minute ago
      agentService.getAgentInstance().attributes.acwMaxTime = 300; // 5 minutes
      
      // Test
      const remainingTime = contactService.getAfterCallWorkRemainingTime();
      
      // Verify
      expect(remainingTime).toBeGreaterThan(0);
      expect(remainingTime).toBeLessThanOrEqual(240); // 4 minutes or less remaining
    });
  });
  
  describe('call transfer', () => {
    it('should transfer to a phone number', async () => {
      // Test
      const result = await contactService.transferToPhoneNumber('987654321');
      
      // Verify
      expect(mockConnection.sendDigits).toHaveBeenCalledWith('*8987654321#');
      expect(result).toBe(true);
    });
    
    it('should initiate a warm transfer to a phone number', async () => {
      // Test
      const result = await contactService.warmTransferToPhoneNumber('987654321');
      
      // Verify
      expect(result).toMatch(/^conn-\d+$/);
    });
    
    it('should transfer to a queue', async () => {
      // Test
      const result = await contactService.transferToQueue('queue1');
      
      // Verify
      expect(mockConnection.sendDigits).toHaveBeenCalledWith('*7queue1#');
      expect(result).toBe(true);
    });
    
    it('should initiate a warm transfer to a queue', async () => {
      // Test
      const result = await contactService.warmTransferToQueue('queue1');
      
      // Verify
      expect(result).toMatch(/^conn-\d+$/);
    });
    
    it('should complete a transfer', async () => {
      // Setup - create a pending transfer
      await contactService.warmTransferToPhoneNumber('987654321');
      
      // Test
      const result = await contactService.completeTransfer();
      
      // Verify
      expect(mockConnection.disconnect).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
  
  describe('conference calls', () => {
    it('should initiate a conference call', async () => {
      // Test
      const result = await contactService.initiateConference('987654321');
      
      // Verify
      expect(result).toMatch(/^conn-\d+$/);
      expect(mockConnection.parameters.get('conferenceId')).toBeDefined();
    });
    
    it('should merge connections into a conference', async () => {
      // Setup - create a conference participant
      await contactService.initiateConference('987654321');
      
      // Test
      const result = await contactService.mergeConnections();
      
      // Verify
      expect(result).toBe(true);
    });
    
    it('should remove a connection from a conference', async () => {
      // Setup - create a conference participant
      const connectionId = await contactService.initiateConference('987654321');
      
      // Test
      const result = await contactService.removeFromConference(connectionId);
      
      // Verify
      expect(result).toBe(true);
    });
    
    it('should get active connections', async () => {
      // Setup - create a conference participant
      await contactService.initiateConference('987654321');
      
      // Test
      const connections = await contactService.getActiveConnections();
      
      // Verify
      expect(connections).toHaveLength(3); // Agent, customer, and conference participant
      expect(connections[0]).toHaveProperty('type', 'agent');
      expect(connections[1]).toHaveProperty('type', 'customer');
      expect(connections[2]).toHaveProperty('type', 'participant');
    });
  });
  
  describe('error handling', () => {
    it('should reject when no contact instance is available', async () => {
      // Setup - reset contact instance
      Object.defineProperty(contactService, 'getContactInstance', {
        value: jest.fn().mockReturnValue(null)
      });
      
      // Test & Verify
      await expect(contactService.acceptContact()).rejects.toThrow('No contact instance available');
      await expect(contactService.transferToPhoneNumber('987654321')).rejects.toThrow('No contact instance available');
      await expect(contactService.initiateConference('987654321')).rejects.toThrow('No contact instance available');
    });
  });
});