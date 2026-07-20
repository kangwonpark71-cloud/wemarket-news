interface ArticleLeadProps {
  text: string
}

export function ArticleLead({ text }: ArticleLeadProps) {
  return (
    <div className="mb-8 border-l-2 border-primary/30 pl-5 lg:mb-10">
      <p className="text-lg leading-[1.7] text-muted-foreground sm:text-xl sm:leading-[1.65]">
        {text}
      </p>
    </div>
  )
}
