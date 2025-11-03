import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Download } from 'lucide-react';
import { lecturesService } from '@/services/lectures';

// List of supported video formats with MIME types, ordered by compatibility
const SUPPORTED_FORMATS = [
  // Most compatible formats first - prioritize MP4 with H.264 codec
  { mime: 'video/mp4', codecs: 'avc1.42E01E,mp4a.40.2' },  // MP4 with H.264 (most widely supported)
  { mime: 'video/mp4', codecs: 'avc1.58A01E,mp4a.40.2' },  // MP4 with H.264 Baseline
  { mime: 'video/mp4' },                                   // Generic MP4 (let browser handle codec detection)
  
  // Fallback formats (commented out for now - enable if needed)
  // { mime: 'video/webm', codecs: 'vp9,opus' },           // WebM with VP9
  // { mime: 'video/webm', codecs: 'vp8,vorbis' },         // WebM with VP8
  
  // Other formats (commented out - enable if needed)
  // { mime: 'video/quicktime' },                          // QuickTime
  // { mime: 'video/x-matroska' },                         // MKV
  // { mime: 'video/x-msvideo' },                          // AVI
  // { mime: 'video/x-ms-wmv' },                           // WMV
  // { mime: 'video/3gpp' },                               // 3GPP
  // { mime: 'video/3gpp2' }                               // 3GPP2 (least compatible)
];

// Check if a video format is supported
const isFormatSupported = async (mimeType: string, codecs?: string): Promise<boolean> => {
  try {
    if (!('MediaSource' in window) || !('isTypeSupported' in MediaSource)) {
      console.warn('MediaSource not supported in this browser');
      return false;
    }
    
    const typeString = codecs ? `${mimeType};codecs="${codecs}"` : mimeType;
    const isSupported = MediaSource.isTypeSupported(typeString);
    
    if (!isSupported) {
      console.warn(`Format not supported: ${typeString}`);
    }
    
    return isSupported;
  } catch (e) {
    console.error('Error checking format support:', e);
    return false;
  }
};

const LecturePlayerPage = () => {
  const { lectureId, courseId } = useParams<{ lectureId: string; courseId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [videoFormats, setVideoFormats] = useState<Array<{url: string, type: string, codecs?: string}>>([]);
  const [currentFormatIndex, setCurrentFormatIndex] = useState(0);
  const [playbackError, setPlaybackError] = useState<MediaError | null>(null);
  const [showDownloadButton, setShowDownloadButton] = useState(false);
  const [videoSource, setVideoSource] = useState<string>('');
  const [isVideoReady, setIsVideoReady] = useState(false);
  
  const baseSrc = lectureId ? lecturesService.streamUrl(lectureId) : '';
  const MAX_RETRIES = 2;
  
  // Generate alternative sources with different formats
  useEffect(() => {
    if (!baseSrc) return;
    
    console.log('Generating video sources for:', baseSrc);
    
    const generateFormats = async () => {
      const formats = [];
      
      // Create a URL object to handle parameters properly
      const createUrl = (format?: string) => {
        // Add .mp4 extension to the path if not present
        let urlPath = baseSrc;
        if (!urlPath.toLowerCase().endsWith('.mp4')) {
          // Remove trailing slash if present
          if (urlPath.endsWith('/')) {
            urlPath = urlPath.slice(0, -1);
          }
          urlPath += '.mp4';
        }
        
        const url = new URL(urlPath, window.location.origin);
        // Remove any existing format or t parameters
        url.searchParams.delete('format');
        url.searchParams.delete('t');
        // Add cache buster
        url.searchParams.set('_', Date.now().toString());
        if (format) {
          url.searchParams.set('format', format);
        }
        console.log('Generated video URL:', url.toString());
        return url.toString();
      };
      
      // Add the original source first
      formats.push({
        url: createUrl('mp4'),
        type: 'video/mp4',
        codecs: 'avc1.42E01E,mp4a.40.2'
      });
      
      // Add other supported formats
      for (const format of SUPPORTED_FORMATS) {
        // Skip if already added or not supported
        if (formats.some(f => f.type === format.mime)) continue;
        
        const isSupported = await isFormatSupported(format.mime, format.codecs);
        if (isSupported) {
          formats.push({
            url: createUrl(format.mime.split('/')[1] || ''),
            type: format.mime,
            codecs: format.codecs
          });
        }
      }
      
      console.log('Available formats:', formats);
      setVideoFormats(formats);
      setCurrentFormatIndex(0);
      
      // If no formats are supported, show error immediately
      if (formats.length === 0) {
        setError('Your browser does not support any of the available video formats.');
        setIsLoading(false);
      } else {
        // Set the first format as the initial source
        setVideoSource(formats[0].url);
      }
    };
    
    generateFormats();
  }, [baseSrc]);

  useEffect(() => {
    if (videoFormats.length > 0 && currentFormatIndex < videoFormats.length) {
      const format = videoFormats[currentFormatIndex];
      console.log(`Trying format ${currentFormatIndex + 1}/${videoFormats.length}:`, format);
      
      // Add a cache buster to prevent caching issues
      const cacheBuster = `t=${Date.now()}`;
      const url = format.url.includes('?') 
        ? `${format.url}&${cacheBuster}` 
        : `${format.url}?${cacheBuster}`;
      
      setVideoSource(url);
      setIsVideoReady(false);
      setIsLoading(true);
      setError(null);
    }
  }, [videoFormats, currentFormatIndex]);

  const handleLoadedData = () => {
    console.log('Video loaded data');
    setIsLoading(false);
    setError(null);
    setIsVideoReady(true);
    
    // Try to play the video
    const playPromise = videoRef.current?.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error('Error attempting to play:', error);
        setError('Video could not be played automatically. Please click the play button.');
      });
    }
  };
  
  const getErrorMessage = (error: MediaError | null) => {
    if (!error) return 'An unknown error occurred.';
    
    switch (error.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        return 'Video playback was aborted.';
      case MediaError.MEDIA_ERR_NETWORK:
        return 'A network error occurred while fetching the video.';
      case MediaError.MEDIA_ERR_DECODE:
        return 'The video playback was aborted due to a corruption problem or because the video uses features your browser does not support.';
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        return 'The video could not be loaded, either because the server or network failed or because the format is not supported.';
      default:
        return `An unknown error occurred (Code: ${error.code}).`;
    }
  };

  const handleError = useCallback((e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = videoRef.current;
    if (!video) return;

    const error = video.error;
    const errorMessage = getErrorMessage(error);
    
    // Enhanced error logging with TypeScript fix
    const errorDetails = {
      error: error ? {
        code: error.code,
        message: error.message,
        // @ts-ignore - name is not in the MediaError type but exists in some browsers
        name: error.name || 'MediaError'
      } : null,
      videoState: {
        readyState: video.readyState,
        networkState: video.networkState,
        currentSrc: video.currentSrc,
        src: video.src,
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        buffered: video.buffered.length > 0 ? {
          start: video.buffered.start(0),
          end: video.buffered.end(0)
        } : 'No buffered data',
        seekable: video.seekable.length > 0 ? {
          start: video.seekable.start(0),
          end: video.seekable.end(0)
        } : 'Not seekable'
      },
      timestamp: new Date().toISOString(),
      format: videoFormats[currentFormatIndex],
      retryCount,
      maxRetries: MAX_RETRIES
    };

    console.error('Video error details:', JSON.stringify(errorDetails, null, 2));

    if (retryCount < MAX_RETRIES) {
      const nextRetry = retryCount + 1;
      setRetryCount(nextRetry);
      console.log(`Retry attempt ${nextRetry} of ${MAX_RETRIES}`);
      
      // Add cache busting to the URL
      const cacheBuster = `retry_${nextRetry}_${Date.now()}`;
      
      // Try next format if available
      if (currentFormatIndex < videoFormats.length - 1) {
        const nextFormatIndex = currentFormatIndex + 1;
        console.log(`Trying format ${nextFormatIndex + 1}/${videoFormats.length}:`, videoFormats[nextFormatIndex]);
        setCurrentFormatIndex(nextFormatIndex);
      } else {
        // If we've tried all formats, try again with the first format with cache busting
        setTimeout(() => {
          console.log('Retrying with first format');
          setCurrentFormatIndex(0);
          setVideoSource(prev => {
            const url = new URL(prev, window.location.origin);
            url.searchParams.set('_', cacheBuster);
            return url.toString();
          });
        }, 1000 * nextRetry);
      }
    } else {
      setError(`Failed to load video after ${MAX_RETRIES} attempts: ${errorMessage}`);
      console.error('Max retries reached, showing error to user');
    }
  }, [retryCount, currentFormatIndex, videoFormats.length, MAX_RETRIES]);

  const handleRetry = () => {
    if (retryCount >= MAX_RETRIES) {
      setError('Failed to load video after multiple attempts. Please try again later.');
      setShowDownloadButton(true);
      setIsLoading(false);
      return;
    }
    
    console.log(`Retry attempt ${retryCount + 1} of ${MAX_RETRIES}`);
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    // Force re-render with a new source URL to bypass caching
    setVideoSource(prev => {
      const url = new URL(prev, window.location.origin);
      url.searchParams.set('retry', retryCount.toString());
      return url.toString();
    });
    
    // Reset retry state after a delay
    setTimeout(() => {
      setIsRetrying(false);
    }, 1000);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const errorHandler = (e: Event) => {
      console.error('Video error event:', e);
      const video = e.target as HTMLVideoElement;
      const error = video.error;
      let errorMessage = 'Failed to load video. ';
      
      if (error) {
        switch(error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage += 'Video playback was aborted.';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage += 'A network error occurred while fetching the video.';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage += 'The video playback was aborted due to a corruption problem or because the video uses features your browser does not support.';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage += 'The video could not be loaded, either because the server or network failed or because the format is not supported.';
            break;
          default:
            errorMessage += `An unknown error occurred (Code: ${error.code}).`;
        }
        console.error('MediaError details:', {
          code: error.code,
          message: error.message,
          name: 'MediaError'
        });
      }
      
      // Check network state
      console.log('Network state:', video.networkState);
      if (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        errorMessage += ' No video source found.';
      } else if (video.networkState === HTMLMediaElement.NETWORK_LOADING) {
        errorMessage += ' The video is still loading.';
      } else if (video.networkState === HTMLMediaElement.NETWORK_IDLE) {
        errorMessage += ' The video is not loading.';
      }
      
      // Check ready state
      console.log('Ready state:', video.readyState);
      
      setError(errorMessage);
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      console.log('Video can play');
      setIsLoading(false);
    };

    video.addEventListener('error', errorHandler);
    video.addEventListener('canplay', handleCanPlay);

    // Log video element state
    console.log('Video source set to:', baseSrc);
    console.log('Video element state:', {
      readyState: video.readyState,
      networkState: video.networkState,
      error: video.error ? {
        code: video.error.code,
        message: video.error.message
      } : null,
      buffered: video.buffered
    });

    return () => {
      video.removeEventListener('error', errorHandler);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [baseSrc]);

  // Handle download button click
  const handleDownload = async () => {
    if (!baseSrc) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(baseSrc);
      if (!response.ok) throw new Error('Failed to fetch video');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lecture-${lectureId}.mp4`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download video. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get the current format being tried
  const currentFormat = videoFormats[currentFormatIndex];

  // Handle retry with different format with a small delay
  const handleRetryMemoized = useCallback(handleRetry, [handleRetry]);
  
  // Update the effect to use the memoized handler
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const errorHandler = (e: Event) => {
      console.error('Video error event:', e);
      handleRetryMemoized();
    };
    
    video.addEventListener('error', errorHandler);
    return () => {
      video.removeEventListener('error', errorHandler);
    };
  }, [handleRetryMemoized]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Lecture Player</h1>
        <div className="flex gap-2">
          {baseSrc && (
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate(`/courses/${courseId}/lectures`)}>
            Back to lectures
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Now Playing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="whitespace-pre-line">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {isLoading && !error && (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              <p className="text-sm text-muted-foreground">
                Loading {currentFormat?.type || 'video'}...
              </p>
            </div>
          )}
          
          {baseSrc ? (
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                key={`video-${currentFormatIndex}-${Date.now()}`}
                controls
                controlsList="nodownload"
                disablePictureInPicture
                preload="auto"
                playsInline
                className="w-full h-full object-contain"
                onLoadedData={handleLoadedData}
                onError={handleError}
                onWaiting={() => setIsLoading(true)}
                onPlaying={() => {
                  console.log('Video is playing');
                  setIsLoading(false);
                  setError(null);
                }}
                onEnded={() => console.log('Video ended')}
                onStalled={() => {
                  console.warn('Video stalled');
                  setIsLoading(true);
                }}
                onSuspend={() => console.log('Video loading suspended')}
                onAbort={() => console.warn('Video loading aborted')}
                onEmptied={() => console.warn('Video emptied')}
              >
                {videoFormats[currentFormatIndex] && (
                  <source
                    src={videoSource}
                    type={`${videoFormats[currentFormatIndex]?.type}${videoFormats[currentFormatIndex]?.codecs ? `; codecs="${videoFormats[currentFormatIndex]?.codecs}"` : ''}`}
                  />
                )}
                Your browser does not support the video tag.
              </video>
              
              {isLoading && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                  <div className="text-white">Loading video...</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">Invalid lecture.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function to get user-friendly error messages
function getErrorMessage(error: MediaError | null): string {
  if (!error) return 'Unknown error';
  
  switch (error.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return 'Video playback was aborted';
    case MediaError.MEDIA_ERR_NETWORK:
      return 'A network error occurred while fetching the video';
    case MediaError.MEDIA_ERR_DECODE:
      return 'Error decoding the video. The format may not be supported.';
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return 'The video format is not supported by your browser';
    default:
      return error.message || 'An unknown error occurred during playback';
  }
}

export default LecturePlayerPage;
