import dynamic from 'next/dynamic';

const ChatInterface = dynamic(() => import('../components/ChatInterface'), { ssr: false });

export default function Home() {
  console.log('Rendering Home component');
  return (
    <main className="min-h-screen">
      <ChatInterface />
    </main>
  );
}
