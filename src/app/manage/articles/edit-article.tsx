"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetArticle, useUpdateArticleMutation } from "@/queries/useArticle";
import {
  UpdateArticleBody,
  UpdateArticleBodyType,
} from "@/schemaValidations/article.schema";
import { useToast } from "@/components/ui/use-toast";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/rich-text-editor";
import ImageUpload from "@/components/image-upload";
// Socket removed: using backend-triggered Pusher events

type EditArticleProps = {
  id: number;
  setId: (value: number | undefined) => void;
  onSubmitSuccess?: () => void;
};

export default function EditArticle({
  id,
  setId,
  onSubmitSuccess,
}: EditArticleProps) {
  const t = useTranslations("ManageArticle");
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const articleId = id || Number(searchParams.get("id"));
  const [open, setOpen] = useState(!!articleId);

  const { data } = useGetArticle({
    id,
    enabled: Boolean(id),
  });

  const updateArticleMutation = useUpdateArticleMutation();

  const form = useForm<UpdateArticleBodyType>({
    resolver: zodResolver(UpdateArticleBody),
    defaultValues: {
      title: "",
      content: "",
      thumbnail: "",
    },
  });

  useEffect(() => {
    if (data) {
      const { title, content, thumbnail } = data.payload.data;
      form.reset({
        title,
        content,
        thumbnail,
      });
    }
  }, [data, form]);

  const onSubmit = async (data: UpdateArticleBodyType) => {
    try {
      await updateArticleMutation.mutateAsync({ id: articleId, ...data });

      toast({
        title: t("UpdateSuccess"),
        description: t("ArticleUpdated", { title: data.title }),
      });
      setOpen(false);
      if (setId) setId(undefined);
      if (onSubmitSuccess) onSubmitSuccess();
      router.push("/manage/articles");
    } catch (error) {
      toast({
        title: t("UpdateFailed"),
        description: t("Error_Generic"),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value && setId) setId(undefined);
        if (!value) router.push("/manage/articles");
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="h-7 gap-1">
          {t("EditArticle")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[1200px] h-[700px] overflow-auto">
        <DialogHeader>
          <DialogTitle>{t("UpdateArticle")}</DialogTitle>
          <DialogDescription>{t("UpdateArticleDescription")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            id="edit-article-form"
            className="grid gap-4 py-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Title")}</FormLabel>
                  <FormControl>
                    <Input id="title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <div className="grid grid-cols-2 items-center justify-items-start gap-4">
                    <Label className="text-sm font-medium w-20">Content</Label>
                    <div className="col-span-3 w-full space-y-2 ">
                      <RichTextEditor
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </div>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="thumbnail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Thumbnail")}</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      folder="articles"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button
            type="submit"
            form="edit-article-form"
            disabled={updateArticleMutation.isPending}
          >
            {updateArticleMutation.isPending
              ? t("Submitting")
              : t("UpdateArticle")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
