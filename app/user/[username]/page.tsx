import { redirect } from 'next/navigation';

interface PageProps {
  params: {
    username: string;
  };
}

export default function UserPage({ params }: PageProps) {
  // First decode the username from the URL, then re-encode it properly for the query parameter
  const decodedUsername = decodeURIComponent(params.username);
  redirect(`/?username=${encodeURIComponent(decodedUsername)}`);
} 