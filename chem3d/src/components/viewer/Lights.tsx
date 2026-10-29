import type { Lighting } from '../../state/settings';

export function Lights({ preset }: { preset: Lighting }) {
  if (preset === 'soft') {
    return (
      <>
        <ambientLight intensity={1.05} />
        <directionalLight position={[4, 6, 8]} intensity={0.9} />
        <directionalLight position={[-6, -3, -4]} intensity={0.35} />
      </>
    );
  }
  if (preset === 'contrast') {
    return (
      <>
        <ambientLight intensity={0.25} />
        <directionalLight position={[6, 9, 7]} intensity={2.6} />
        <directionalLight position={[-7, 2, -6]} intensity={1.1} color="#9db4ff" />
      </>
    );
  }
  return (
    <>
      <ambientLight intensity={0.6} />
      <hemisphereLight args={['#dfe8ff', '#1a2033', 0.45]} />
      <directionalLight position={[5, 8, 6]} intensity={1.7} />
      <directionalLight position={[-6, -2, -4]} intensity={0.45} />
    </>
  );
}
