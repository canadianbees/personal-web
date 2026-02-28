import Image from "next/image";
import React from "react";
import { HyperText } from "@/components/ui/hyper-text"


interface Props {
  src: string;
  title: string;
  description: string;
}

const ProjectCard = ({ src, title, description }: Props) => {
  return (
    <div className="relative overflow-hidden rounded-lg shadow-lg border-black border-4">
      <Image
        src={src}
        alt={title}
        width={500}
        height={500}
        className="object-cover"
      />

      <div className="relative  h-full p-4 border p-4bg-white/5 border-white/5 backdrop-blur-lg font-mono">
        <HyperText duration={3000} className="text-2xl font-semibold text-white">{title}</HyperText>
        <p className="mt-2 text-gray-300">{description}</p>
      </div>
    </div>
  );
};

export default ProjectCard;