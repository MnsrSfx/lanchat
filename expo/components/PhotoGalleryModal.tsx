import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PhotoGalleryModalProps {
  visible: boolean;
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function PhotoGalleryModal({
  visible,
  photos,
  initialIndex = 0,
  onClose,
}: PhotoGalleryModalProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loadingImages, setLoadingImages] = useState<{ [key: number]: boolean }>({});
  const [errorImages, setErrorImages] = useState<{ [key: number]: boolean }>({});

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      const initialLoading: { [key: number]: boolean } = {};
      photos.forEach((_, index) => {
        initialLoading[index] = true;
      });
      setLoadingImages(initialLoading);
      setErrorImages({});
      
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: initialIndex * SCREEN_WIDTH,
          y: 0,
          animated: false,
        });
      }, 100);
    }
  }, [visible, initialIndex, photos]);

  const handleImageLoad = (index: number) => {
    setLoadingImages((prev) => ({ ...prev, [index]: false }));
  };

  const handleImageError = (index: number) => {
    console.error('❌ Failed to load image at index:', index, photos[index]);
    setLoadingImages((prev) => ({ ...prev, [index]: false }));
    setErrorImages((prev) => ({ ...prev, [index]: true }));
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {Platform.OS === 'android' && <StatusBar backgroundColor="#000" />}
        
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <View style={styles.closeButtonCircle}>
            <X size={24} color="#fff" />
          </View>
        </TouchableOpacity>

        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {photos.map((photo, index) => (
            <View key={index} style={styles.imageContainer}>
              {loadingImages[index] && (
                <ActivityIndicator
                  size="large"
                  color="#fff"
                  style={styles.loader}
                />
              )}
              {errorImages[index] ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Failed to load image</Text>
                  <Text style={styles.errorSubText}>The image may have been deleted or is unavailable</Text>
                </View>
              ) : (
                <Image
                  source={{ uri: photo }}
                  style={styles.image}
                  resizeMode="contain"
                  onLoad={() => handleImageLoad(index)}
                  onError={() => handleImageError(index)}
                />
              )}
            </View>
          ))}
        </ScrollView>

        {photos.length > 1 && (
          <View style={styles.pagination}>
            {photos.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentIndex && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  closeButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loader: {
    position: 'absolute',
    zIndex: 1,
  },
  pagination: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
});
