import { render, screen } from '@testing-library/react'
import { PlateChip } from './PlateChip'

describe('PlateChip', () => {
  it('formata a placa antiga com hífen e a Mercosul sem', () => {
    render(
      <>
        <PlateChip placa="abc1234" />
        <PlateChip placa="abc1d23" />
      </>,
    )
    expect(screen.getByText('ABC-1234')).toBeInTheDocument()
    expect(screen.getByText('ABC1D23')).toBeInTheDocument()
  })
})
