import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { API_URL } from '@/config';
import { useTheme } from '@/theme/useTheme';

/**
 * The round's clip: YouTube's own player, set to play just the clip's
 * stretch of the video. YouTube only plays embeds on a page with a known
 * origin, so the player sits in a tiny page "from" our server.
 */
export function ClipPlayer({ url }: { url: string }) {
  const { radius } = useTheme();
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style></head><body><iframe src="${escapeAttribute(url)}" allow="autoplay; encrypted-media" allowfullscreen></iframe></body></html>`;

  return (
    <View testID="clip-player" style={{ aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: 'hidden' }}>
      <WebView
        source={{ html, baseUrl: API_URL }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        style={{ backgroundColor: '#000' }}
      />
    </View>
  );
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
