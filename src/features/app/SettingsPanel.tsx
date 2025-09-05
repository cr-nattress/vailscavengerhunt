import React from 'react'

interface SettingsPanelProps {
  locationName: string
  teamName: string
  onChangeLocation: (value: string) => void
  onChangeTeam: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export default function SettingsPanel({
  locationName,
  teamName,
  onChangeLocation,
  onChangeTeam,
  onSave,
  onCancel
}: SettingsPanelProps) {
  return (
    <div className='mt-4'>
      <div className='space-y-4'>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            Location
          </label>
          <select
            value={locationName}
            onChange={(e) => onChangeLocation(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent opacity-50 cursor-not-allowed'
            disabled={true}
          >
            <option value="BHHS">BHHS</option>
            <option value="Vail Valley">Vail Valley</option>
            <option value="Vail Village">Vail Village</option>
            <option value="TEST">TEST</option>
          </select>
        </div>
        
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            Team
          </label>
          <input
            type='text'
            value={teamName}
            onChange={(e) => onChangeTeam(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            placeholder='Enter your team name'
          />
        </div>
        
        <div className='flex gap-3'>
          <button
            onClick={onSave}
            className='flex-1 px-4 py-2 text-white font-medium rounded-md transition-all duration-150 transform hover:scale-[1.02] active:scale-[0.98]'
            style={{
              backgroundColor: 'var(--color-cabernet)'
            }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-cabernet-hover)'}
            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-cabernet)'}
            onMouseDown={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-cabernet-active)'}
            onMouseUp={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-cabernet-hover)'}
          >
            Save Changes
          </button>
          <button
            onClick={onCancel}
            className='flex-1 px-4 py-2 font-medium rounded-md transition-all duration-150 transform hover:scale-[1.02] active:scale-[0.98]'
            style={{
              backgroundColor: 'var(--color-light-grey)',
              color: 'var(--color-dark-neutral)'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'var(--color-warm-grey)';
              (e.target as HTMLElement).style.color = 'var(--color-white)'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'var(--color-light-grey)';
              (e.target as HTMLElement).style.color = 'var(--color-dark-neutral)'
            }}
            onMouseDown={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-blush-pink)'}
            onMouseUp={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-warm-grey)'}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}