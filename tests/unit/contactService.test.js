// Test script for contactService.js
// This tests the optimized and new functions in the contactService

import contactService from '../../src/services/providers/AmazonConnect/contactService';
import agentService from '../../src/services/providers/AmazonConnect/agentService';

// Mock dependencies
jest.mock('../../src/services/providers/AmazonConnect/agentService');

describe('contactService', () => {
  let mockContactInstance;
  let mockConnection;
  let mockAgentConnection;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup global window.connect mock
    global.window = {
      connect: {
        ContactType: {
          INBOUND: 'inbound'
        },
        ConnectionType: {
          INBOUND: 'inbound'
        },
        Endpoint: {
          byPhoneNumber: jest.fn().mockReturnValue({ endpoint: 'phone' }),
          byQueueId: jest.fn().mockReturnValue({ endpoint: 'queue' })
        }
      }
    };
    
    // Mock connections
    mockConnection = {
      getType: jest.fn().mockReturnValue('inbound'),
      getStatus: jest.fn().mockReturnValue({ type: 'connected' }),
      accept: jest.fn(({ success }) => success()),
      destroy: jest.fn(({ success }) => success()),
      hold: jest.fn(({ success }) => success()),
      resume: jest.fn(({ success }) => success()),
      getConnectionId: jest.fn().mockReturnValue('conn-123')
    };
    
    mockAgentConnection = {
      getType: jest.fn().mockReturnValue('agent'),
      getStatus: jest.fn().mockReturnValue({ type: 'connected' }),
      destroy: jest.fn(({ success }) => success()),
      getConnectionId: jest.fn().mockReturnValue('agent-conn-123')
    };
    
    // Mock contact instance
    mockContactInstance = {
      getType: jest.fn().mockReturnValue('inbound'),
      getInitialConnection: jest.fn().mockReturnValue(mockConnection),
      getAgentConnection: jest.fn().mockReturnValue(mockAgentConnection),
      getConnections: jest.fn().mockReturnValue([mockConnection, mockAgentConnection]),
      getStatus: jest.fn().mockReturnValue({ type: 'connected' }),
      complete: jest.fn(({ success }) => success()),
      updateAttributes: jest.fn(({ success }) => success()),
      addConnection: jest.fn(({ success }) => success('new-conn-123')),
      toggleActiveConnections: jest.fn(({ success }) => success()),
      mergeConnections: jest.fn(({ success }) => success())
    };
    
    // Set the mock contact instance
    Object.defineProperty(contactService, 'getContactInstance', {
      value: jest.fn().mockReturnValue(mockContactInstance)
    });
    
    // Mock agent instance
    const mockAgentInstance = {
      getAgentStates: jest.fn().mockReturnValue([{ type: 'routable', name: 'Available' }]),
      setState: jest.fn(({ success }) => success())
    };
    
    agentService.getAgentInstance.mockReturnValue(mockAgentInstance);
  });
  
  describe('Basic call handling', () => {
    it('should accept an incoming call', async () => {
      const result = await contactService.acceptContact();
      expect(mockConnection.accept).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should decline an incoming call', async () => {
      const result = await contactService.declineContact();
      expect(mockConnection.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should end a contact', async () => {
      const result = await contactService.endContact();
      expect(mockAgentConnection.destroy).toHaveBeenCalled();
      expect(mockContactInstance.complete).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should hold a call', async () => {
      const result = await contactService.holdCall();
      expect(mockConnection.hold).toHaveBeenCalled();
      expect(result).toBe('Call successfully put on hold.');
    });
    
    it('should resume a call', async () => {
      // Change the connection status to 'hold' for resume test
      mockAgentConnection.getStatus.mockReturnValueOnce({ type: 'hold' });
      
      const result = await contactService.resumeCall();
      expect(mockConnection.resume).toHaveBeenCalled();
      expect(result).toBe('Call successfully resumed.');
    });
  });
  
  describe('Call transfer functions', () => {
    it('should transfer to a phone number', async () => {
      const result = await contactService.transferToPhoneNumber('123456789');
      expect(window.connect.Endpoint.byPhoneNumber).toHaveBeenCalledWith('123456789');
      expect(mockContactInstance.toggleActiveConnections).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should initiate a warm transfer to a phone number', async () => {
      const result = await contactService.warmTransferToPhoneNumber('123456789');
      expect(window.connect.Endpoint.byPhoneNumber).toHaveBeenCalledWith('123456789');
      expect(mockContactInstance.addConnection).toHaveBeenCalled();
      expect(result).toBe('new-conn-123');
    });
    
    it('should transfer to a queue', async () => {
      const result = await contactService.transferToQueue('queue-123');
      expect(window.connect.Endpoint.byQueueId).toHaveBeenCalledWith('queue-123');
      expect(mockContactInstance.toggleActiveConnections).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should initiate a warm transfer to a queue', async () => {
      const result = await contactService.warmTransferToQueue('queue-123');
      expect(window.connect.Endpoint.byQueueId).toHaveBeenCalledWith('queue-123');
      expect(mockContactInstance.addConnection).toHaveBeenCalled();
      expect(result).toBe('new-conn-123');
    });
    
    it('should complete a transfer', async () => {
      const result = await contactService.completeTransfer();
      expect(mockAgentConnection.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
  
  describe('Conference call functions', () => {
    it('should initiate a conference call', async () => {
      const result = await contactService.initiateConference('123456789');
      expect(window.connect.Endpoint.byPhoneNumber).toHaveBeenCalledWith('123456789');
      expect(mockContactInstance.addConnection).toHaveBeenCalled();
      expect(result).toBe('new-conn-123');
    });
    
    it('should merge connections into a conference', async () => {
      const result = await contactService.mergeConnections();
      expect(mockContactInstance.mergeConnections).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should remove a connection from a conference', async () => {
      const result = await contactService.removeFromConference('conn-123');
      expect(mockConnection.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should get active connections', async () => {
      const result = await contactService.getActiveConnections();
      expect(mockContactInstance.getConnections).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('connectionId', 'conn-123');
      expect(result[1]).toHaveProperty('connectionId', 'agent-conn-123');
    });
  });
  
  describe('After Call Work functions', () => {
    it('should enter After Call Work mode', async () => {
      const result = await contactService.enterAfterCallWork();
      expect(mockAgentConnection.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should complete After Call Work', async () => {
      const result = await contactService.completeAfterCallWork('resolved', 'Test notes');
      expect(mockContactInstance.updateAttributes).toHaveBeenCalled();
      expect(mockContactInstance.complete).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
  
  describe('Error handling', () => {
    it('should reject when no contact instance is available', async () => {
      // Override the mock to return null
      Object.defineProperty(contactService, 'getContactInstance', {
        value: jest.fn().mockReturnValue(null)
      });
      
      await expect(contactService.acceptContact()).rejects.toThrow('No contact instance available');
      await expect(contactService.transferToPhoneNumber('123456789')).rejects.toThrow('No contact instance available');
      await expect(contactService.initiateConference('123456789')).rejects.toThrow('No contact instance available');
    });
    
    it('should handle connection errors', async () => {
      // Mock a connection that fails
      mockConnection.hold = jest.fn(({ failure }) => failure('Connection error'));
      
      await expect(contactService.holdCall()).rejects.toThrow('Failed to put call on hold');
    });
  });
});