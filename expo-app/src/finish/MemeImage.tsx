import { useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

/** Offsets drawn in black behind the caption, for the classic meme outline. */
const OUTLINE = [
  [-2, -2],
  [2, -2],
  [-2, 2],
  [2, 2],
  [0, -2],
  [0, 2],
  [-2, 0],
  [2, 0],
] as const;

const FONT = Platform.select({ ios: 'Impact', default: 'sans-serif-condensed' });

/**
 * A picture with a caption in classic meme style: bold white capitals with
 * a black outline over the bottom of the image, sized to its width.
 */
export function MemeImage({ uri, alt, caption, testID }: { uri: string; alt: string; caption?: string | null; testID?: string }) {
  const { radius } = useTheme();
  const [ratio, setRatio] = useState(4 / 3);
  const [width, setWidth] = useState(0);
  const fontSize = Math.max(14, Math.min(40, width * 0.075));
  const text = caption?.trim().toUpperCase();

  const line = (color: string, dx = 0, dy = 0, key?: string) => (
    <Text
      key={key}
      style={[styles.caption, { fontSize, lineHeight: fontSize * 1.1, color, fontFamily: FONT }, dx || dy ? { position: 'absolute', left: dx, right: -dx, top: dy } : null]}
    >
      {text}
    </Text>
  );

  return (
    <View
      testID={testID}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000' }}
    >
      <Image
        source={{ uri }}
        accessibilityLabel={alt}
        resizeMode="cover"
        onLoad={(event) => {
          const { width: w, height: h } = event.nativeEvent.source;
          if (w && h) setRatio(w / h);
        }}
        style={{ width: '100%', aspectRatio: ratio }}
      />
      {text ? (
        <View testID={testID ? `${testID}-caption` : undefined} style={styles.captionBox} pointerEvents="none">
          <View>
            {OUTLINE.map(([dx, dy]) => line('#000', dx, dy, `${dx}:${dy}`))}
            {line('#fff')}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  captionBox: { position: 'absolute', left: '4%', right: '4%', bottom: '3%' },
  caption: { fontWeight: '900', textAlign: 'center' },
});
