import { describe, expect, it } from 'vitest';
import { grabAtom, pickAngle } from '../bendPick';

describe('grabbing an atom with a finger', () => {
  const center: [number, number] = [100, 100];
  const atoms = [
    { atom: 1, x: 160, y: 100, reach: 44 },
    { atom: 2, x: 100, y: 170, reach: 44 },
  ];

  it('catches the nearest atom within its reach, even beside it', () => {
    expect(grabAtom(190, 112, center, atoms, 22)).toBe(1);
    expect(grabAtom(120, 205, center, atoms, 22)).toBe(2);
  });

  it('catches an atom by its bond, but not next to the central atom', () => {
    expect(grabAtom(125, 108, center, atoms, 22)).toBe(1); // 42% along the bond, 8 px off it
    expect(grabAtom(108, 103, center, atoms, 22)).toBe(-1); // on the central atom: the view turns
    expect(grabAtom(40, 40, center, atoms, 22)).toBe(-1); // empty space
  });
});

describe('choosing the angle from one or two fingers', () => {
  // A symmetric pair of atoms on screen: at index k they are 10·k px either side of x = 100.
  const screenOf = (k: number, atom: number): [number, number] => [100 + (atom === 1 ? 10 * k : -10 * k), 50];

  it('follows one finger along its atom’s path', () => {
    expect(pickAngle(10, screenOf, [{ atom: 1, x: 141, y: 55 }])).toBe(4);
  });

  it('opens or closes the angle with two fingers on two atoms', () => {
    expect(pickAngle(10, screenOf, [{ atom: 1, x: 170, y: 50 }, { atom: 2, x: 30, y: 50 }])).toBe(7);
    expect(pickAngle(10, screenOf, [{ atom: 1, x: 112, y: 50 }, { atom: 2, x: 88, y: 50 }])).toBe(1);
  });
});
