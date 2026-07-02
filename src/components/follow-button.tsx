'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck } from 'lucide-react';

export default function FollowButton({ targetUserId, targetUsername }: { targetUserId: string; targetUsername: string }) {
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    fetch(`/api/community/follow?user_id=${targetUserId}`)
      .then(r => r.json())
      .then(d => {
        setFollowing(d.following);
        setFollowerCount(d.follower_count);
      });
    fetch('/api/community/profile')
      .then(r => r.json())
      .then(d => {
        if (d.profile?.id === targetUserId) setIsOwnProfile(true);
      });
  }, [targetUserId]);

  const toggleFollow = async () => {
    if (loading || isOwnProfile) return;
    setLoading(true);
    try {
      const res = await fetch('/api/community/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetUserId }),
      });
      const data = await res.json();
      setFollowing(data.following);
      setFollowerCount(data.follower_count);
    } catch (e) {}
    setLoading(false);
  };

  if (isOwnProfile) return null;

  return (
    <Button variant={following ? 'outline' : 'default'} onClick={toggleFollow} disabled={loading}>
      {following ? <UserCheck className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
      {following ? 'Following' : 'Follow'}
      {followerCount > 0 && <span className="ml-1 text-xs opacity-60">({followerCount})</span>}
    </Button>
  );
}
