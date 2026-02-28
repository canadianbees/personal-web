"use client"
import { motion } from 'framer-motion'
import { slideInFromLeft, slideInFromRight, slideInFromTop } from '../utils/motion'
import { MorphingText } from "@/components/ui/morphing-text"
import { RainbowButton } from "@/components/ui/rainbow-button"
import { useEffect, useState } from 'react';
import { OrbitingCircles } from '@/components/ui/orbiting-circles';
import StackIcon from "tech-stack-icons";
import { AuroraText } from '@/components/ui/aurora-text';
import { Avatar } from "@heroui/avatar";
import {DeviconCplusplus} from '../../icons/DeviconCplusplus'
import DeviconGo from '@/components/icons/DeviconGo';
import GrommetIconsGithub from '@/components/icons/GrommetIconsGithub';
import DeviconTypescript from '@/components/icons/DeviconTypescript';
import DeviconPython from '@/components/icons/DeviconPython';
import DeviconJava from '@/components/icons/DeviconJava';
import DeviconGithubactions from '@/components/icons/DeviconGithubactions';

const HeroContent = () => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className='flex flex-row items-center justify-center px-6 md:px-20 w-full h-screen z-20'>
      <div className='h-full w-full flex flex-col justify-center items-center md:items-start m-auto text-center md:text-start'>
        <motion.div
          variants={slideInFromTop}
          className="flex flex-col mt-6 font-mono font-bold text-white w-full max-w-full md:max-w-150 text-4xl md:text-6xl">
          <MorphingText texts={["celina alzenor", "software engineer", "platypus enjoyer", "solitaire enthusiast"]}/>
          <motion.div
            variants={slideInFromLeft(0.8)}
            className="text-lg text-gray-400 mb-10 max-w-full md:max-w-150">
              <AuroraText speed={2.5}>Seeking new roles and opportunites</AuroraText>          
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        variants={slideInFromRight(0.9)}
        className="w-full h-full justify-evenly items-center hidden lg:flex"
      >
        <OrbitingCircles iconSize={70} radius={275} path={false}>
          <DeviconPython width="8em" height="8em"/>
          <DeviconCplusplus width="8em" height="8em"/>
          <DeviconGo width="8em" height="8em"/>
          <DeviconTypescript width="8em" height="8em"/>
          <DeviconJava width="8em" height="8em"/>
        </OrbitingCircles>
          <Avatar isBordered color="success" className="w-135 h-136 text-large z-[-1]" src='/DSC01275.jpg'/>
        <OrbitingCircles radius={200} iconSize={50} reverse path={false}>
          <StackIcon name="gcloud" variant="dark"/>
          <StackIcon name="docker" variant="dark"/>          
          <GrommetIconsGithub width="8em" height="8em" className='text-white'/>
          <StackIcon name="openai" variant="dark"/>
          <DeviconGithubactions width="8em" height="8em"/>
          <img src="/BigQuery.svg" width="70" height="70" alt="BigQuery"/>
        </OrbitingCircles>
      </motion.div>

    </motion.div>
  )
}

export default HeroContent