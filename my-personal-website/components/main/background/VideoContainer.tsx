import React from 'react'
import BackgroundVideo from 'next-video/background-video';
import myVideo from '../../../videos/VID_20260226_225927.MP4'


const VideoContainer = () => {
    return (
        <div className='fixed inset-0 z-[-1] pointer-events-none'>
   <BackgroundVideo
            src={myVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className='w-full h-full object-cover'>
            </BackgroundVideo>


        </div>
         
    )
}

export default VideoContainer