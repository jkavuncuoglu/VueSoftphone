// Test script for Twilio agentService.js
// This tests the Twilio implementation of the agent service

import agentService from '../../src/services/providers/Twilio/agentService';

describe('Twilio agentService', () => {
  let mockWorkerInstance;
  let mockWorkspaceInstance;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock workspace
    mockWorkspaceInstance = {
      activities: {
        'act1': { sid: 'act1', friendlyName: 'Available', type: 'routable' },
        'act2': { sid: 'act2', friendlyName: 'Unavailable', type: 'not-routable' },
        'act3': { sid: 'act3', friendlyName: 'Offline', type: 'offline' }
      }
    };
    
    // Setup mock worker
    mockWorkerInstance = {
      sid: 'worker123',
      friendlyName: 'Test Agent',
      activity: { friendlyName: 'Available', dateUpdated: new Date().toISOString() },
      activityName: 'Available',
      attributes: {
        username: 'testagent',
        extension: '1234',
        skills: ['sales', 'support'],
        routingProfile: 'Default Profile',
        preferences: {},
        isMuted: false
      },
      tasks: {
        'task1': {
          sid: 'task1',
          status: 'assigned',
          taskChannelUniqueName: 'voice',
          attributes: {
            direction: 'inbound',
            customer: { phoneNumber: '123456789' }
          }
        }
      },
      workspace: mockWorkspaceInstance,
      updateActivity: jest.fn((activitySid, callbacks) => callbacks.success()),
      updateAttributes: jest.fn((attributes, callbacks) => callbacks.success()),
      on: jest.fn()
    };
    
    // Setup global window.Twilio mock
    global.window = {
      Twilio: {
        TaskRouter: {
          Workspace: jest.fn().mockReturnValue(mockWorkspaceInstance),
          Worker: jest.fn().mockReturnValue(mockWorkerInstance)
        },
        Device: {
          activeConnection: jest.fn().mockReturnValue({
            mute: jest.fn()
          })
        }
      }
    };
  });
  
  describe('initialization', () => {
    it('should initialize the agent service', async () => {
      // Setup
      const callbacks = {
        onAgentAvailable: jest.fn(),
        onStateChange: jest.fn()
      };
      
      // Test
      const result = await agentService.initializeAgent(callbacks);
      
      // Verify
      expect(window.Twilio.TaskRouter.Workspace).toHaveBeenCalled();
      expect(window.Twilio.TaskRouter.Worker).toHaveBeenCalled();
      expect(mockWorkerInstance.on).toHaveBeenCalled();
      expect(callbacks.onAgentAvailable).toHaveBeenCalledWith(mockWorkerInstance);
      expect(result).toBe(mockWorkerInstance);
    });
    
    it('should reject if Twilio TaskRouter SDK is not loaded', async () => {
      // Setup
      global.window.Twilio.TaskRouter = undefined;
      
      // Test & Verify
      await expect(agentService.initializeAgent({})).rejects.toThrow('Twilio TaskRouter SDK not loaded');
    });
  });
  
  describe('agent state management', () => {
    it('should get the agent state', () => {
      // Setup - agent is already initialized in beforeEach
      
      // Test
      const state = agentService.getAgentState();
      
      // Verify
      expect(state).toBe('Available');
    });
    
    it('should get available agent states', async () => {
      // Test
      const states = await agentService.getAvailableAgentStates();
      
      // Verify
      expect(states).toHaveLength(3);
      expect(states[0]).toHaveProperty('name', 'Available');
      expect(states[0]).toHaveProperty('isRoutable', true);
    });
    
    it('should set the agent status', async () => {
      // Test
      const result = await agentService.setAgentStatus('Unavailable');
      
      // Verify
      expect(mockWorkerInstance.updateActivity).toHaveBeenCalledWith('act2', expect.any(Object));
      expect(result).toBe('Unavailable');
    });
    
    it('should get the routing state', async () => {
      // Test
      const state = await agentService.getRoutingState();
      
      // Verify
      expect(state).toHaveProperty('name', 'Available');
      expect(state).toHaveProperty('isRoutable', true);
    });
    
    it('should log out the agent', async () => {
      // Test
      const result = await agentService.logout();
      
      // Verify
      expect(mockWorkerInstance.updateActivity).toHaveBeenCalledWith('act3', expect.any(Object));
      expect(result).toBe(true);
    });
  });
  
  describe('agent configuration', () => {
    it('should get the agent configuration', async () => {
      // Test
      const config = await agentService.getAgentConfiguration();
      
      // Verify
      expect(config).toHaveProperty('name', 'Test Agent');
      expect(config).toHaveProperty('username', 'testagent');
      expect(config).toHaveProperty('extension', '1234');
      expect(config.routingProfile).toHaveProperty('name', 'Default Profile');
      expect(config.routingProfile).toHaveProperty('skills', ['sales', 'support']);
    });
    
    it('should update the agent configuration', async () => {
      // Setup
      const updates = {
        softphoneAutoAccept: true,
        extension: '5678',
        routingProfile: {
          name: 'Premium Support',
          skills: ['premium', 'vip']
        }
      };
      
      // Test
      const result = await agentService.updateAgentConfiguration(updates);
      
      // Verify
      expect(mockWorkerInstance.updateAttributes).toHaveBeenCalled();
      expect(result).toHaveProperty('softphoneAutoAccept', true);
      expect(result).toHaveProperty('extension', '5678');
      expect(result.routingProfile).toHaveProperty('name', 'Premium Support');
      expect(result.routingProfile).toHaveProperty('skills', ['premium', 'vip']);
    });
  });
  
  describe('agent statistics and contacts', () => {
    it('should get agent statistics', async () => {
      // Test
      const stats = await agentService.getAgentStatistics();
      
      // Verify
      expect(stats).toHaveProperty('contactsHandled');
      expect(stats).toHaveProperty('averageHandleTime');
    });
    
    it('should get agent snapshot', async () => {
      // Test
      const snapshot = await agentService.getAgentSnapshot();
      
      // Verify
      expect(snapshot).toHaveProperty('state', 'Available');
      expect(snapshot).toHaveProperty('contacts');
      expect(snapshot).toHaveProperty('isMuted', false);
    });
    
    it('should get agent contacts', async () => {
      // Test
      const contacts = await agentService.getAgentContacts();
      
      // Verify
      expect(contacts).toHaveLength(1);
      expect(contacts[0]).toHaveProperty('contactId', 'task1');
      expect(contacts[0]).toHaveProperty('isInbound', true);
    });
    
    it('should get agent permissions', async () => {
      // Test
      const permissions = await agentService.getAgentPermissions();
      
      // Verify
      expect(permissions).toHaveProperty('canTransferCalls', true);
      expect(permissions).toHaveProperty('canCreateConferences', true);
    });
  });
  
  describe('microphone control', () => {
    it('should mute the microphone', async () => {
      // Setup
      const activeCall = window.Twilio.Device.activeConnection();
      
      // Test
      const result = await agentService.mute();
      
      // Verify
      expect(activeCall.mute).toHaveBeenCalledWith(true);
      expect(result).toBe(true);
    });
    
    it('should unmute the microphone', async () => {
      // Setup
      const activeCall = window.Twilio.Device.activeConnection();
      
      // Test
      const result = await agentService.unmute();
      
      // Verify
      expect(activeCall.mute).toHaveBeenCalledWith(false);
      expect(result).toBe(true);
    });
  });
  
  describe('error handling', () => {
    it('should reject when no agent instance is available', async () => {
      // Setup - reset agent instance
      Object.defineProperty(agentService, 'getAgentInstance', {
        value: jest.fn().mockReturnValue(null)
      });
      
      // Test & Verify
      await expect(agentService.getAvailableAgentStates()).rejects.toThrow('No agent instance available');
      await expect(agentService.setAgentStatus('Available')).rejects.toThrow('No agent instance available');
      await expect(agentService.mute()).rejects.toThrow('No agent instance available');
    });
  });
});