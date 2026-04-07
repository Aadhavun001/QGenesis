import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { firestoreChatShareService } from '@/services/firebase/firestore-database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, ArrowLeft } from 'lucide-react';

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

const SharedChat: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [share, setShare] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!shareId) return;
      setLoading(true);
      setNotFound(false);
      try {
        const data = await firestoreChatShareService.getShare(shareId);
        if (cancelled) return;
        if (!data || !data.isPublic) {
          setNotFound(true);
          setShare(null);
        } else {
          setShare(data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [shareId]);

  const safeTitle = useMemo(() => {
    const t = (share?.title || 'Shared QGenesis Chat').toString().trim();
    return t.length > 0 ? t : 'Shared QGenesis Chat';
  }, [share?.title]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading shared chat…</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-xl w-full">
          <CardHeader>
            <CardTitle className="text-lg">Chat not available</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <p>This shared chat link is invalid, private, or has been removed.</p>
            <Button asChild variant="outline">
              <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Back</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 flex justify-center">
      <div className="w-full max-w-4xl space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs text-muted-foreground">QGenesis • Shared chat</div>
            <div className="text-xl font-semibold tracking-tight">{safeTitle}</div>
            {share?.materialTitle && (
              <div className="text-sm text-muted-foreground mt-1">Material: {share.materialTitle}</div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => downloadBlob('qgenesis-chat.txt', new Blob([share.text || ''], { type: 'text/plain;charset=utf-8' }))}>
              <Download className="w-4 h-4 mr-2" />Download TXT
            </Button>
            <Button onClick={() => downloadBlob('qgenesis-chat.html', new Blob([share.html || ''], { type: 'text/html;charset=utf-8' }))}>
              <Download className="w-4 h-4 mr-2" />Download HTML
            </Button>
          </div>
        </div>

        <Separator />

        <Card>
          <CardContent className="p-0">
            {/* Render the exported HTML (already self-contained) */}
            <iframe
              title="Shared chat"
              srcDoc={share.html || '<p>Empty chat.</p>'}
              className="w-full h-[75vh] rounded-md"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SharedChat;

