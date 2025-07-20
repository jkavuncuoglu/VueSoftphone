// Test script for agentService.js
// This tests the optimized and new functions in the agentService

import agentService from '../../src/services/providers/AmazonConnect/agentService';

describe('agentService', () => {
  let mockAgentInstance;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup global window.connect mock
    global.window = {
      connect: {
        agent: jest.fn(callback => callback(mockAgentInstance)),
        getLog: jest.fn(() => ({
          _rolledLogs: ['log1', 'log2'],
          _logs: ['log3', 'log4']
        }))
      }
    };
    
    // Mock agent instance
    mockAgentInstance = {
      getState: jest.fn().mockReturnValue({ 
        name: 'Available', 
        type: 'routable',
        startTimestamp: Date.now()
      }),
      getAgentStates: jest.fn().mockReturnValue([
        { name: 'Available', type: 'routable' },
        { name: 'Offline', type: 'offline' },
        { name: 'Lunch', type: 'not-routable' }
      ]),
      setState: jest.fn((state, callbacks) => callbacks.success()),
      getConfiguration: jest.fn().mockReturnValue({
        name: 'Test Agent',
        username: 'testagent',
        userId: 'agent-123',
        softphoneEnabled: true,
        softphoneAutoAccept: false,
        extension: '1234',
        routingProfile: { name: 'Default Profile' },
        agentPreferences: {}
      }),
      setSoftphoneAutoAccept: jest.fn(),
      getContacts: jest.fn().mockReturnValue([
        {
          getContactId: () => 'contact-123',
          getState: () => ({ type: 'connected' }),
          getType: () => 'voice',
          isInbound: () => true,
          isConnected: () => true,
          getConnections: () => [
            {
              getConnectionId: () => 'conn-123',
              getState: () => ({ type: 'connected' }),
              getType: () => 'inbound'
            }
          ]
        }
      ]),
      isMuted: jest.fn().mockReturnValue(false),
      mute: jest.fn(),
      unmute: jest.fn(),
      onStateChange: jest.fn(callback => callback({ 
        newState: { name: 'Available', type: 'routable' } 
      })),
      onMuteToggle: jest.fn(callback => callback()),
      onRefresh: jest.fn(callback => {}),
      onSoftphoneError: jest.fn(callback => {}),
      onAfterCallWork: jest.fn(callback => {}),
      onContactPending: jest.fn(callback => {})
    };
    
    // Reset the agent instance in the service
    Object.defineProperty(agentService, 'getAgentInstance', {
      value: jest.fn().mockReturnValue(mockAgentInstance)
    });
  });
  
  describe('Basic agent functions', () => {
    it('should initialize the agent service', async () => {
      const callbacks = {
        onAgentAvailable: jest.fn(),
        onStateChange: jest.fn()
      };
      
      const result = await agentService.initializeAgent(callbacks);
      
      expect(window.connect.agent).toHaveBeenCalled();
      expect(callbacks.onAgentAvailable).toHaveBeenCalled();
      expect(result).toBe(mockAgentInstance);
    });
    
    it('should get the agent state', () => {
      const state = agentService.getAgentState();
      
      expect(mockAgentInstance.getState).toHaveBeenCalled();
      expect(state).toBe('Available');
    });
    
    it('should set the agent status', async () => {
      const result = await agentService.setAgentStatus('Available');
      
      expect(mockAgentInstance.getAgentStates).toHaveBeenCalled();
      expect(mockAgentInstance.setState).toHaveBeenCalled();
      expect(result).toBe('Available');
    });
    
    it('should reject when setting an invalid status', async () => {
      await expect(agentService.setAgentStatus('InvalidStatus'))
        .rejects.toThrow('Invalid agent status');
    });
  });
  
  describe('Agent state management', () => {
    it('should get available agent states', async () => {
      const states = await agentService.getAvailableAgentStates();
      
      expect(mockAgentInstance.getAgentStates).toHaveBeenCalled();
      expect(states).toHaveLength(3);
      expect(states[0]).toHaveProperty('name', 'Available');
      expect(states[0]).toHaveProperty('isRoutable', true);
    });
    
    it('should get the routing state', async () => {
      const state = await agentService.getRoutingState();
      
      expect(mockAgentInstance.getState).toHaveBeenCalled();
      expect(state).toHaveProperty('name', 'Available');
      expect(state).toHaveProperty('isRoutable', true);
    });
    
    it('should set the routing state', async () => {
      const result = await agentService.setRoutingState('Available');
      
      expect(mockAgentInstance.getAgentStates).toHaveBeenCalled();
      expect(mockAgentInstance.setState).toHaveBeenCalled();
      expect(result).toBe('Available');
    });
    
    it('should log out the agent', async () => {
      const result = await agentService.logout();
      
      expect(mockAgentInstance.getAgentStates).toHaveBeenCalled();
      expect(mockAgentInstance.setState).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
  
  describe('Agent configuration', () => {
    it('should get the agent configuration', async () => {
      const config = await agentService.getAgentConfiguration();
      
      expect(mockAgentInstance.getConfiguration).toHaveBeenCalled();
      expect(config).toHaveProperty('name', 'Test Agent');
      expect(config).toHaveProperty('username', 'testagent');
    });
    
    it('should update the agent configuration', async () => {
      const updates = { softphoneAutoAccept: true };
      const result = await agentService.updateAgentConfiguration(updates);
      
      expect(mockAgentInstance.setSoftphoneAutoAccept).toHaveBeenCalledWith(true);
      expect(result).toHaveProperty('softphoneAutoAccept', true);
    });
  });
  
  describe('Agent statistics and contacts', () => {
    it('should get agent statistics', async () => {
      const stats = await agentService.getAgentStatistics();
      
      expect(stats).toHaveProperty('contactsHandled');
      expect(stats).toHaveProperty('averageHandleTime');
    });
    
    it('should get agent snapshot', async () => {
      const snapshot = await agentService.getAgentSnapshot();
      
      expect(snapshot).toHaveProperty('state', 'Available');
      expect(snapshot).toHaveProperty('contacts');
      expect(snapshot).toHaveProperty('isMuted', false);
    });
    
    it('should get agent contacts', async () => {
      const contacts = await agentService.getAgentContacts();
      
      expect(contacts).toHaveLength(1);
      expect(contacts[0]).toHaveProperty('contactId', 'contact-123');
      expect(contacts[0]).toHaveProperty('isInbound', true);
      expect(contacts[0].connections).toHaveLength(1);
    });
    
    it('should get agent permissions', async () => {
      const permissions = await agentService.getAgentPermissions();
      
      expect(permissions).toHaveProperty('canAccessReports');
      expect(permissions).toHaveProperty('canTransferCalls');
    });
  });
  
  describe('Microphone control', () => {
    it('should mute the microphone', async () => {
      const result = await agentService.mute();
      
      expect(mockAgentInstance.mute).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should unmute the microphone', async () => {
      const result = await agentService.unmute();
      
      expect(mockAgentInstance.unmute).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
  
  describe('CCP logs', () => {
    it('should get CCP logs', () => {
      const logs = agentService.getCcpLogs();
      
      expect(window.connect.getLog).toHaveBeenCalled();
      expect(logs).toHaveLength(4);
    });
  });
  
  describe('Error handling', () => {
    it('should reject when no agent instance is available', async () => {
      // Override the mock to return null
      Object.defineProperty(agentService, 'getAgentInstance', {
        value: jest.fn().mockReturnValue(null)
      });
      
      await expect(agentService.getAvailableAgentStates()).rejects.toThrow('No agent instance available');
      await expect(agentService.setAgentStatus('Available')).rejects.toThrow('No agent instance available');
      await expect(agentService.mute()).rejects.toThrow('No agent instance available');
    });
    
    it('should reject when Amazon Connect API is not loaded', async () => {
      // Remove the connect object
      global.window.connect = undefined;
      
      await expect(agentService.initializeAgent({})).rejects.toThrow('Amazon Connect Streams API not loaded');
    });
  });
});