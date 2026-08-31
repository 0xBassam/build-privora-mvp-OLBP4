import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/sections/Hero";
import { WhoWeAre } from "@/components/sections/WhoWeAre";
import { Products } from "@/components/sections/Products";
import { Ecosystem } from "@/components/sections/Ecosystem";
import { WhatWeDo } from "@/components/sections/WhatWeDo";
import { WhyRiseLoops } from "@/components/sections/WhyRiseLoops";
import { Philosophy } from "@/components/sections/Philosophy";
import { Security } from "@/components/sections/Security";
import { SaudiArabia } from "@/components/sections/SaudiArabia";
import { Approach } from "@/components/sections/Approach";
import { CompanyVision } from "@/components/sections/CompanyVision";
import { FinalCTA } from "@/components/sections/FinalCTA";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <WhoWeAre />
        <Products />
        <Ecosystem />
        <WhatWeDo />
        <WhyRiseLoops />
        <Philosophy />
        <Security />
        <SaudiArabia />
        <Approach />
        <CompanyVision />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
