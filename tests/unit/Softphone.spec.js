import { mount, shallowMount } from '@vue/test-utils'
import Softphone from '../../src/components/Softphone.vue'
import CallStatus from '../../src/components/CallStatus.vue'
import IncomingCallActions from '../../src/components/IncomingCallActions.vue'
import OutgoingCallActions from '../../src/components/OutgoingCallActions.vue'
import { getSoftphoneService } from '../../src/services/softphoneFactory'

// Mock the softphone service
jest.mock('../../src/services/softphoneFactory', () => ({
    getSoftphoneService: jest.fn(() => ({
        initialize: jest.fn(),
        placeCall: jest.fn(),
        hangUpCall: jest.fn(),
        muteConnection: jest.fn(),
        unmuteConnection: jest.fn(),
        transferCall: jest.fn(),
        endTransferCall: jest.fn(),
        openLogin: jest.fn()
    }))
}))

describe('Softphone.vue', () => {
    const createWrapper = (propsData = {}) => {
        return shallowMount(Softphone, {
            propsData: {
                phoneNumbers: [],
                transferNumbers: [],
                ...propsData
            }
        })
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('initializes with default props', () => {
        const wrapper = createWrapper()
        expect(wrapper.vm.initialized).toBe(false)
        expect(wrapper.vm.contactActive).toBe(false)
        expect(wrapper.vm.agent.status).toBe('Initializing')
    })

    it('initializes softphone service on mount', () => {
        const wrapper = createWrapper()
        expect(getSoftphoneService).toHaveBeenCalledWith('amazon-connect')
        expect(wrapper.vm.softphone.initialize).toHaveBeenCalled()
    })

    describe('placeCall', () => {
        it('places outgoing call correctly', () => {
            const wrapper = createWrapper()
            const phoneNumber = '+1234567890'

            wrapper.vm.placeCall(phoneNumber)

            expect(wrapper.vm.callType).toBe('Outgoing')
            expect(wrapper.vm.contactActive).toBe(true)
            expect(wrapper.vm.softphone.placeCall).toHaveBeenCalledWith(phoneNumber)
        })
    })

    describe('handleEndCall', () => {
        it('ends call and resets state', async () => {
            const wrapper = createWrapper()
            wrapper.setData({
                contactActive: true,
                agent: { muted: true }
            })

            await wrapper.vm.handleEndCall()

            expect(wrapper.vm.softphone.hangUpCall).toHaveBeenCalled()
            expect(wrapper.vm.contactActive).toBe(false)
        })
    })

    describe('handleMuteAudio', () => {
        it('mutes the connection', () => {
            const wrapper = createWrapper()
            wrapper.vm.handleMuteAudio()
            expect(wrapper.vm.softphone.muteConnection).toHaveBeenCalled()
        })
    })

    describe('handleStatusChange', () => {
        it('updates agent status', () => {
            const wrapper = createWrapper()
            const newStatus = 'Available'

            wrapper.vm.handleStatusChange(newStatus)

            expect(wrapper.vm.agent.status).toBe(newStatus)
        })

        it('handles failed connection', () => {
            const wrapper = createWrapper()
            const errorStatus = 'FailedConnectCustomer'

            wrapper.vm.handleStatusChange(errorStatus)

            expect(wrapper.emitted()['call-error']).toBeTruthy()
            expect(wrapper.emitted()['call-error'][0]).toEqual(['FailedToConnect'])
        })
    })

    describe('call transfer', () => {
        it('handles call transfer correctly', () => {
            const wrapper = createWrapper()
            const transferNumber = {
                phoneNumber: '+1234567890',
                warm: true
            }

            wrapper.vm.handleCallTransfer(transferNumber)

            expect(wrapper.vm.transferActive).toBe(true)
            expect(wrapper.vm.softphone.transferCall).toHaveBeenCalledWith(
                transferNumber.phoneNumber,
                transferNumber.warm
            )
        })
    })
})