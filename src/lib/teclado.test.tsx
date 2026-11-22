import { fireEvent, render, screen } from '@testing-library/react'
import { enterConfirma } from './teclado'

function Form({ onEnviar }: { onEnviar: () => void }) {
  return (
    <form onKeyDown={enterConfirma(onEnviar)}>
      <input aria-label="campo" />
      <button type="button">Serviço</button>
      <textarea aria-label="obs" />
    </form>
  )
}

describe('Enter confirma', () => {
  it('confirma a partir de campos e botões, mas não de textarea', () => {
    const onEnviar = vi.fn()
    render(<Form onEnviar={onEnviar} />)
    fireEvent.keyDown(screen.getByLabelText('campo'), { key: 'Enter' })
    fireEvent.keyDown(screen.getByRole('button', { name: 'Serviço' }), { key: 'Enter' })
    fireEvent.keyDown(screen.getByLabelText('obs'), { key: 'Enter' })
    fireEvent.keyDown(screen.getByLabelText('campo'), { key: 'Enter', shiftKey: true })
    expect(onEnviar).toHaveBeenCalledTimes(2)
  })
})
