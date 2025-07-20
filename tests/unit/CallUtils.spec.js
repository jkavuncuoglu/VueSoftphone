import CallUtils from '../../src/services/callUtils'

describe('CallUtils', () => {
    describe('normalizeToE164', () => {
        it('normalizes US phone numbers', () => {
            expect(CallUtils.normalizeToE164('(123) 456-7890')).toBe('+11234567890')
            expect(CallUtils.normalizeToE164('123-456-7890')).toBe('+11234567890')
            expect(CallUtils.normalizeToE164('1234567890')).toBe('+11234567890')
        })

        it('handles numbers that are already in E.164 format', () => {
            expect(CallUtils.normalizeToE164('+11234567890')).toBe('+11234567890')
        })

        it('handles international numbers', () => {
            expect(CallUtils.normalizeToE164('+442071234567')).toBe('+442071234567')
        })
    })
})