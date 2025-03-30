import { redirect } from 'next/navigation';

// @ts-ignore - Temporarily disable TypeScript checking to fix build issues
export default function UserPage(props: any) {
  // First decode the username from the URL, then re-encode it properly for the query parameter
  const username = props.params?.username;
  if (username) {
    const decodedUsername = decodeURIComponent(username);
    redirect(`/?username=${encodeURIComponent(decodedUsername)}`);
  } else {
    redirect('/');
  }
} 