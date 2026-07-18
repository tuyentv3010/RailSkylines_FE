"use client";

import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/rich-text-editor";
import ImageUpload from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  CreateArticleBody,
  CreateArticleBodyType,
} from "@/schemaValidations/article.schema";
import { useToast } from "@/components/ui/use-toast";
import { useAddArticleMutation } from "@/queries/useArticle";
// Socket removed: using backend-triggered Pusher events

export default function AddArticle() {
  const t = useTranslations("ManageArticle");
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const addArticleMutation = useAddArticleMutation();

  const form = useForm<CreateArticleBodyType>({
    resolver: zodResolver(CreateArticleBody),
    defaultValues: {
      title: "",
      content: "",
      thumbnail: "",
    },
  });

  const onSubmit = async (data: CreateArticleBodyType) => {
    try {
      await addArticleMutation.mutateAsync(data);

      toast({
        title: t("AddSuccess"),
        description: t("ArticleAdded", { title: data.title }),
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error adding article:", error);
      toast({
        title: t("AddFailed"),
        description: t("Error_Generic"),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-7 gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span>{t("AddArticle")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[1200px] h-[700px] overflow-auto">
        <DialogHeader>
          <DialogTitle>{t("AddArticle")}</DialogTitle>
          <DialogDescription>{t("AddArticleDescription")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            id="add-article-form"
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
                    <Label
                      htmlFor="content"
                      className="text-sm font-medium w-20"
                    >
                      Content
                    </Label>
                    <div className="col-span-3 w-full space-y-2 ">
                      <RichTextEditor
                        value={field.value}
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
            form="add-article-form"
            disabled={addArticleMutation.isPending}
          >
            {addArticleMutation.isPending ? t("Submitting") : t("AddArticle")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
