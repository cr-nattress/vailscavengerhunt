import { TeamsConfig } from '../../types/config'

export const teamsConfig: TeamsConfig = {
  organizations: {
    bhhs: {
      id: 'bhhs',
      name: 'Berkshire Hathaway HomeServices',
      hunts: {
        'fall-2025': {
          id: 'fall-2025',
          name: 'Fall 2025',
          teams: [
            { id: 'berrypicker', displayName: 'Berrypicker' },
            { id: 'poppyfieldswest', displayName: 'Poppyfields West' },
            { id: 'teacup', displayName: 'Tea Cup' },
            { id: 'simba', displayName: 'Simba' },
            { id: 'whippersnapper', displayName: 'Whippersnapper' },
            { id: 'minniesmile', displayName: "Minnie's Mile" },
            { id: 'bornfree', displayName: 'Born Free' },
            { id: 'lookma', displayName: 'Look Ma' },
            { id: 'loversleap', displayName: "Lover's Leap" },
            { id: 'forever', displayName: 'Forever' }
          ]
        }
      }
    }
  }
}