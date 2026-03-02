"use client"
import { motion } from "motion/react"
import { slideInFromLeft, slideInFromRight, slideInFromTop } from '../utils/motion'
import { MorphingText } from "@/components/ui/morphing-text"
import { OrbitingCircles } from '@/components/ui/orbiting-circles';
import StackIcon from "tech-stack-icons";
import { AuroraText } from '@/components/ui/aurora-text';
import { Avatar } from "@heroui/avatar";
import { DeviconCplusplus } from '../../icons/DeviconCplusplus'
import DeviconTypescript from '@/components/icons/DeviconTypescript';
import DeviconPython from '@/components/icons/DeviconPython';
import DeviconJava from '@/components/icons/DeviconJava';
import DeviconGithubactions from '@/components/icons/DeviconGithubactions';
import { Linkedin } from '@styled-icons/simple-icons'
import { Github } from '@styled-icons/simple-icons'
import { Docker } from '@styled-icons/simple-icons'
import { Go } from '@styled-icons/simple-icons'
import { Openai } from '@styled-icons/simple-icons'


const HeroContent = () => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className='flex flex-row items-center justify-center px-6 md:px-20 w-full h-screen z-20'>
      <div className='h-full w-full flex flex-col justify-center items-center md:items-start m-auto text-center md:text-start'>
        <motion.div
          variants={slideInFromTop}
          className="flex flex-col gap-18 font-mono font-bold w-full max-w-full md:gap-5 md:max-w-150 text-4xl md:text-6xl ">
          <MorphingText texts={["celina alzenor", "software engineer", "platypus enjoyer", "solitaire enthusiast"]} />
          <motion.div
            variants={slideInFromLeft(0.8)}
            className="flex flex-col md:mt-15 text-lg text-gray-400 max-w-full md:max-w-150 gap-18">
            <AuroraText speed={5}>
              Seeking new opportunites and roles
            </AuroraText>
            <div className="flex flex-row gap-5 justify-center">
              <a href="https://www.linkedin.com/in/celina-alzenor/">  <Linkedin size={25} color="#0A66C2" /> </a>
              <a href="https://github.com/canadianbees"><Github size={25} color="#FFFFFF" /></a>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        variants={slideInFromRight(0.9)}
        className="w-full h-full justify-evenly items-center hidden lg:flex"
      >
        <OrbitingCircles iconSize={70} radius={275} path={false}>
          <DeviconPython width="8em" height="8em" />
          <DeviconCplusplus width="8em" height="8em" />
          <Go size={100} color="#29BEB0" />
          <DeviconTypescript width="8em" height="8em" />
          <DeviconJava width="8em" height="8em" />
        </OrbitingCircles>
        <Avatar isBordered color="success" className="w-135 h-136 text-large z-[-1]" src='/DSC01275.jpg' />
        <OrbitingCircles radius={200} iconSize={50} reverse path={false}>
          <StackIcon name="gcloud" variant="dark" />
          <Docker size={100} color="#2560FF" />
          <Github size={100} color="#FFFFFF" />
          <Openai size={100} color="#FFFFFF" />
          <DeviconGithubactions width="8em" height="8em" />
          <img src="/BigQuery.svg" width="70" height="70" alt="BigQuery" />
        </OrbitingCircles>
      </motion.div>

    </motion.div>
  )
}

export default HeroContent