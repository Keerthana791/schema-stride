import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Download } from 'lucide-react';
import { lecturesService } from '@/services/lectures';

// List of supported video formats with MIME types
const SUPPORTED_FORMATS = [
  { mime: 'video/mp4', codecs: 'avc1.42E01E,mp4a.40.2' },  // MP4 with H.264
  { mime: 'video/webm', codecs: 'vp9,opus' },              // WebM with VP9
  { mime: 'video/ogg', codecs: 'theora,vorbis' },          // Ogg Theora
  { mime: 'video/x-matroska', codecs: 'avc1,opus' },       // MKV with H.264
  { mime: 'video/quicktime', codecs: 'avc1' },             // MOV
  { mime: 'video/x-msvideo', codecs: '' },                 // AVI
  { mime: 'video/x-ms-wmv', codecs: 'wmv3' },              // WMV
  { mime: 'video/mpeg', codecs: 'mpeg2video' },            // MPEG
  { mime: 'video/3gpp', codecs: 'mp4v.20.8' },             // 3GPP
  { mime: 'video/3gpp2', codecs: 'mp4v.20.8' }             // 3GPP2
];

// Check if a video format is supported
const isFormatSupported = async (mimeType: string, codecs: string): Promise<boolean> => {
  try {
    return await (document.createElement('video').canPlayType(`${mimeType};codecs="${codecs}"`) !== '');
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
  const [showFallback, setShowFallback] = useState(false);
  const [videoFormats, setVideoFormats] = useState<Array<{url: string, type: string, codecs: string}>>([]);
  const [currentFormatIndex, setCurrentFormatIndex] = useState(0);
  
  const baseSrc = lectureId ? lecturesService.streamUrl(lectureId) : '';
  
  // Generate alternative sources with different formats
  useEffect(() => {
    if (!baseSrc) return;
    
    console.log('Generating video sources for:', baseSrc);
    
    // Add a timestamp to prevent caching issues
    const timestamp = `t=${Date.now()}`;
    const srcWithTimestamp = baseSrc.includes('?') 
      ? `${baseSrc}&${timestamp}`
      : `${baseSrc}?${timestamp}`;
    
    const formats = SUPPORTED_FORMATS.map(format => {
      const url = format.mime === 'video/mp4' 
        ? `${srcWithTimestamp}&format=mp4`
        : srcWithTimestamp;
        
      return {
        url,
        type: format.mime,
        codecs: format.codecs
      };
    });
    
    console.log('Available video formats:', formats);
    setVideoFormats(formats);
    setCurrentFormatIndex(0);
  }, [baseSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleError = (e: Event) => {
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

    video.addEventListener('error', handleError);
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
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [baseSrc]);

  // Handle download button click
  const handleDownload = () => {
    if (!baseSrc) return;
    const link = document.createElement('a');
    link.href = baseSrc;
    link.download = `lecture-${lectureId}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle retry with different format with a small delay
  const handleRetry = useCallback(async () => {
    if (!videoFormats.length) return;
    
    if (currentFormatIndex >= videoFormats.length - 1) {
      const formatsTried = videoFormats.map((f, i) => `• ${f.type} (${f.codecs})`).join('\n');
      setError(`No supported video format found. The following formats were tried:\n${formatsTried}\n\nPlease try downloading the video instead.`);
      setIsLoading(false);
      return;
    }

    const nextIndex = currentFormatIndex + 1;
    const nextFormat = videoFormats[nextIndex];
    
    console.log(`Trying format ${nextIndex + 1}/${videoFormats.length}:`, nextFormat);
    
    // Update state first
    setCurrentFormatIndex(nextIndex);
    setError(null);
    setIsLoading(true);
    
    // Use a small delay to allow React to update the DOM
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!videoRef.current) return;
    
    try {
      // Pause and reset the video element
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
      
      // Create a new source element
      const source = document.createElement('source');
      source.src = nextFormat.url;
      source.type = nextFormat.type;
      
      // Clear existing sources and add the new one
      videoRef.current.innerHTML = '';
      videoRef.current.appendChild(source);
      
      // Add error handler to the source element
      source.onerror = () => {
        console.error(`Failed to load source: ${nextFormat.type}`);
        handleRetry();
      };
      
      // Load the new source
      videoRef.current.load();
      
      // Try to play after metadata is loaded
      videoRef.current.onloadedmetadata = async () => {
        try {
          if (videoRef.current) {
            await videoRef.current.play();
            setIsLoading(false);
          }
        } catch (e) {
          console.error('Error playing video:', e);
          handleRetry();
        }
      };
      
    } catch (e) {
      console.error('Error changing video source:', e);
      handleRetry();
    }
  }, [currentFormatIndex, videoFormats]);
    }
  };

  // Get the current format being tried
  const currentFormat = videoFormats[currentFormatIndex];
  
  // Add useCallback to memoize the retry handler
  const handleRetryMemoized = useCallback(handleRetry, [currentFormatIndex, videoFormats, handleRetry]);
  
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
              <AlertTitle>Error playing video</AlertTitle>
              <AlertDescription className="mt-2">
                <div className="whitespace-pre-line mb-2">{error}</div>
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Current format: {currentFormat?.type || 'N/A'}
                    {currentFormat?.codecs && ` (${currentFormat.codecs})`}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleRetry}>
                      Try different format
                    </Button>
                    {baseSrc && (
                      <Button variant="outline" size="sm" onClick={handleDownload}>
                        <Download className="h-3 w-3 mr-1" /> Download
                      </Button>
                    )}
                  </div>
                </div>
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
            <div className="relative">
              <video
                ref={videoRef}
                key={`video-${currentFormatIndex}`}
                controls
                className="w-full rounded-lg bg-black"
                onError={(e) => {
                  const target = e.target as HTMLVideoElement;
                  const error = target.error;
                  const networkState = target.networkState;
                  const readyState = target.readyState;
                  
                  console.error('Video element error:', {
                    event: e,
                    error: error ? {
                      code: error.code,
                      message: error.message,
                      name: 'MediaError'
                    } : null,
                    networkState,
                    readyState,
                    currentSrc: target.currentSrc,
                    src: target.src
                  });
                  
                  // Try next format automatically
                  handleRetry();
                }}
                onCanPlay={() => {
                  console.log('Video can play, format:', currentFormat);
                  setIsLoading(false);
                }}
                onLoadStart={() => {
                  console.log('Video load started');
                  setIsLoading(true);
                }}
                onWaiting={() => {
                  console.log('Video waiting for data');
                  setIsLoading(true);
                }}
                onPlaying={() => {
                  console.log('Video playing');
                  setIsLoading(false);
                }}
                onStalled={() => {
                  console.warn('Video stalled');
                  setIsLoading(true);
                }}
                onSuspend={() => console.log('Video loading suspended')}
                onAbort={() => console.warn('Video loading aborted')}
                onEmptied={() => console.warn('Video emptied')}
              >
                {showFallback ? (
                  // Try all supported formats if fallback is enabled
                  videoFormats.map((format, index) => (
                    <source
                      key={index}
                      src={format.url}
                      type={format.type}
                    />
                  ))
                ) : (
                  // Default to the original source first
                  <source src={baseSrc} type="video/mp4" />
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

export default LecturePlayerPage;
