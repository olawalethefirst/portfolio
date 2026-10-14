interface SectionHeadingProps {
  children: string;
  id?: string;
}

export function SectionHeading({ children, id }: SectionHeadingProps) {
  return (
    <div className="[container-type:inline-size] py-12 lg:py-16">
      <h2
        id={id}
        className="section-heading-outline m-0 text-center text-[clamp(2.4rem,12cqi,10rem)] leading-[1.1] font-black tracking-[-0.02em] text-inherit uppercase [font-family:inherit] [overflow-wrap:anywhere]"
      >
        {children}
      </h2>
    </div>
  );
}
