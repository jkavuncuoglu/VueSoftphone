import { getSoftphoneService } from '../../../src/services/softphoneFactory'
import amazonConnectService from '../../../src/services/providers/AmazonConnect/amazonConnectService'

describe('softphoneFactory', () => {
    it('returns amazon connect service for amazon-connect provider', () => {
        const service = getSoftphoneService('amazon-connect')
        expect(service).toBe(amazonConnectService)
    })

    it('throws error for unknown provider', () => {
        expect(() => {
            getSoftphoneService('unknown-provider')
        }).toThrow('Unknown telephony provider: unknown-provider')
    })
})