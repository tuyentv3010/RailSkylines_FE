"use client";

import { Label } from "@/components/ui/label";
import { Editor } from "@tinymce/tinymce-react";
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
import { useState, useRef } from "react";
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
              render={({ field }) => {
                const editorRef = useRef<any>(null);

                return (
                  <FormItem>
                    <div className="grid grid-cols-2 items-center justify-items-start gap-4">
                      <Label
                        htmlFor="content"
                        className="text-sm font-medium w-20"
                      >
                        Content
                      </Label>
                      <div className="col-span-3 w-full space-y-2 ">
                        <Editor
                          apiKey="zb9ne0kag6qmj7bdngggcylyum72gf57d8bnkstmrtcjc4zv"
                          onInit={(evt, editor) => (editorRef.current = editor)}
                          value={field.value}
                          onEditorChange={(content) => field.onChange(content)}
                          init={{
                            height: 500,
                            menubar: true,
                            plugins: [
                              "advlist autolink lists link image charmap print preview anchor",
                              "searchreplace visualblocks code fullscreen",
                              "insertdatetime media table paste code help wordcount",
                            ],
                            toolbar:
                              "undo redo | formatselect | bold italic backcolor | " +
                              "alignleft aligncenter alignright alignjustify | " +
                              "bullist numlist outdent indent | removeformat | help",
                            content_style:
                              "body { font-family:Arial,sans-serif; font-size:14px }",
                            external_plugins: {
                              searchreplace:
                                "https://cdnjs.cloudflare.com/ajax/libs/tinymce/5.10.0/plugins/searchreplace/plugin.min.js",
                              visualblocks:
                                "https://cdnjs.cloudflare.com/ajax/libs/tinymce/5.10.0/plugins/visualblocks/plugin.min.js",
                              code: "https://cdnjs.cloudflare.com/ajax/libs/tinymce/5.10.0/plugins/code/plugin.min.js",
                              fullscreen:
                                "https://cdnjs.cloudflare.com/ajax/libs/tinymce/5.10.0/plugins/fullscreen/plugin.min.js",
                            },
                          }}
                        />
                        <FormMessage />
                      </div>
                    </div>
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="thumbnail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Thumbnail")}</FormLabel>
                  <FormControl>
                    <Input id="thumbnail" {...field} />
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
