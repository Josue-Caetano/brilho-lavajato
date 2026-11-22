import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { PinPad } from './PinPad'

function Harness({ onComplete }: { onComplete: (v: string) => void }) {
  const [v, setV] = useState('')
  return <PinPad value={v} onChange={setV} onComplete={onComplete} />
}

describe('PinPad', () => {
  it('completa com 4 dígitos clicados', async () => {
    const onComplete = vi.fn()
    render(<Harness onComplete={onComplete} />)
    for (const d of ['1', '2', '3', '4']) await userEvent.click(screen.getByRole('button', { name: d }))
    expect(onComplete).toHaveBeenCalledWith('1234')
  })

  it('aceita o teclado físico e apaga com Backspace', async () => {
    const onComplete = vi.fn()
    render(<Harness onComplete={onComplete} />)
    await userEvent.keyboard('12{Backspace}345')
    expect(onComplete).toHaveBeenCalledWith('1345')
    expect(screen.getByRole('status')).toHaveAccessibleName('4 de 4 dígitos digitados')
  })
})
