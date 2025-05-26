"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import Select from "react-select";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { handleErrorApi } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useGetRole,
  useAddRoleMutation,
  useUpdateRoleMutation,
} from "@/queries/useRole";
import { useGetPermissionList } from "@/queries/usePermission";
import {
  CreateRoleBody,
  CreateRoleBodyType,
  UpdateRoleBodyType,
} from "@/schemaValidations/role.schema";
import { debounce } from "lodash";

type RoleModalProps = {
  open: boolean;
  setOpen: (value: boolean) => void;
  roleId?: number;
  onSubmitSuccess?: () => void;
};

type PermissionOption = {
  value: number;
  label: string;
  module: string;
  methods: { id: number; method: string; name: string; apiPath: string }[];
};

type MethodState = {
  id: number;
  method: string;
  enabled: boolean;
};

export default function RoleModal({
  open,
  setOpen,
  roleId,
  onSubmitSuccess,
}: RoleModalProps) {
  const t = useTranslations("ManageRole");
  const submissionRef = useRef<number>(0);
  const isEdit = !!roleId;

  const { data: roleData } = useGetRole({
    id: roleId!,
    enabled: isEdit,
  });

  const { data: permissionsData } = useGetPermissionList(1, 100);
  const permissions = permissionsData?.payload.data.result ?? [];

  const groupedPermissions = permissions.reduce((acc, perm) => {
    const existing = acc.find((p) => p.module === perm.module);
    if (existing) {
      existing.methods.push({
        id: perm.id,
        method: perm.method,
        name: perm.name,
        apiPath: perm.apiPath,
      });
    } else {
      acc.push({
        value: perm.id,
        label: perm.module,
        module: perm.module,
        methods: [
          {
            id: perm.id,
            method: perm.method,
            name: perm.name,
            apiPath: perm.apiPath,
          },
        ],
      });
    }
    return acc;
  }, [] as PermissionOption[]);

  const addRoleMutation = useAddRoleMutation();
  const updateRoleMutation = useUpdateRoleMutation();

  const form = useForm<CreateRoleBodyType>({
    resolver: zodResolver(CreateRoleBody),
    defaultValues: {
      name: "",
      description: "",
      active: true,
      permissions: [],
    },
  });

  const [selectedPermissions, setSelectedPermissions] = useState<
    PermissionOption[]
  >([]);
  const [methodStates, setMethodStates] = useState<Map<string, MethodState[]>>(
    new Map()
  );

  useEffect(() => {
    if (isEdit && roleData) {
      if (roleData.payload) {
        const {
          name,
          description,
          active,
          permissions: rolePermissions,
        } = roleData.payload.data;

        const initialMethodStates = new Map<string, MethodState[]>();
        groupedPermissions.forEach((perm) => {
          const methodState = perm.methods.map((m) => ({
            id: m.id,
            method: m.method,
            enabled: rolePermissions.some((rp) => rp.id === m.id),
          }));
          initialMethodStates.set(perm.module, methodState);
        });

        form.reset({
          name,
          description: description ?? "",
          active,
          permissions: rolePermissions.map((p) => ({ id: p.id })),
        });
        setSelectedPermissions(groupedPermissions);
        setMethodStates(initialMethodStates);
      }
    } else {
      form.reset({
        name: "",
        description: "",
        active: true,
        permissions: [],
      });
      setSelectedPermissions(groupedPermissions);
      const initialMethodStates = new Map<string, MethodState[]>();
      groupedPermissions.forEach((perm) => {
        const methodState = perm.methods.map((m) => ({
          id: m.id,
          method: m.method,
          enabled: false,
        }));
        initialMethodStates.set(perm.module, methodState);
      });
      setMethodStates(initialMethodStates);
    }
  }, [roleData, isEdit, form]);

  const reset = () => {
    form.reset();
    setSelectedPermissions([]);
    setMethodStates(new Map());
    setOpen(false);
  };

  const debouncedSubmit = debounce(async (values: CreateRoleBodyType) => {
    submissionRef.current += 1;
    console.log(
      `RoleModal submission attempt #${submissionRef.current}:`,
      values
    );

    if (addRoleMutation.isPending || updateRoleMutation.isPending) {
      console.log("Mutation is pending, skipping submission");
      return;
    }

    try {
      if (isEdit) {
        const body: UpdateRoleBodyType = {
          name: values.name,
          description: values.description,
          active: values.active,
          permissions: values.permissions,
        };
        const result = await updateRoleMutation.mutateAsync({
          id: roleId!,
          body,
        });
        toast({ description: result.payload.message });
      } else {
        const result = await addRoleMutation.mutateAsync(values);
        toast({ description: result.payload.message });
      }
      reset();
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (error) {
      console.error("Submission error:", error);
      handleErrorApi({ error, setError: form.setError });
      toast({
        title: t("Error"),
        description: isEdit ? t("FailedToUpdateRole") : t("FailedToAddRole"),
        variant: "destructive",
      });
    }
  }, 300);

  const handlePermissionChange = (newValue: any) => {
    const selected = newValue as PermissionOption[];
    setSelectedPermissions(selected);

    const updatedMethodStates = new Map(methodStates);
    selected.forEach((perm) => {
      if (!updatedMethodStates.has(perm.module)) {
        const methodState = perm.methods.map((m) => ({
          id: m.id,
          method: m.method,
          //   enabled: form.getValues("permissions").some((p) => p.id === m.id),
          enabled: (form.getValues("permissions") ?? []).some(
            (p) => p.id === m.id
          ),
        }));
        updatedMethodStates.set(perm.module, methodState);
      }
    });

    const selectedModules = selected.map((p) => p.module);
    const keysToRemove = Array.from(updatedMethodStates.keys()).filter(
      (key) => !selectedModules.includes(key)
    );
    keysToRemove.forEach((key) => updatedMethodStates.delete(key));

    setMethodStates(updatedMethodStates);

    const updatedPermissions = Array.from(updatedMethodStates.entries())
      .flatMap(([module, methods]) =>
        methods.filter((m) => m.enabled).map((m) => ({ id: m.id }))
      )
      .filter(
        (perm, index, self) => self.findIndex((p) => p.id === perm.id) === index
      );
    form.setValue("permissions", updatedPermissions);
  };

  const handleModuleToggle = (module: string, checked: boolean) => {
    const updatedMethodStates = new Map(methodStates);
    const methods = updatedMethodStates.get(module) || [];
    const updatedMethods = methods.map((m) => ({ ...m, enabled: checked }));
    updatedMethodStates.set(module, updatedMethods);
    setMethodStates(updatedMethodStates);

    const updatedPermissions = Array.from(updatedMethodStates.entries())
      .flatMap(([mod, methods]) =>
        methods.filter((m) => m.enabled).map((m) => ({ id: m.id }))
      )
      .filter(
        (perm, index, self) => self.findIndex((p) => p.id === perm.id) === index
      );
    form.setValue("permissions", updatedPermissions);
  };

  const handleMethodToggle = (
    module: string,
    methodId: number,
    checked: boolean
  ) => {
    const updatedMethodStates = new Map(methodStates);
    const methods = updatedMethodStates.get(module) || [];
    const updatedMethods = methods.map((m) =>
      m.id === methodId ? { ...m, enabled: checked } : m
    );
    updatedMethodStates.set(module, updatedMethods);
    setMethodStates(updatedMethodStates);

    const updatedPermissions = Array.from(updatedMethodStates.entries())
      .flatMap(([mod, methods]) =>
        methods.filter((m) => m.enabled).map((m) => ({ id: m.id }))
      )
      .filter(
        (perm, index, self) => self.findIndex((p) => p.id === perm.id) === index
      );
    form.setValue("permissions", updatedPermissions);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset();
      }}
    >
      <DialogContent className="sm:max-w-[800px] max-h-screen overflow-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("UpdateRole") : t("AddRole")}</DialogTitle>
          <DialogDescription>
            {isEdit ? t("UpdateRoleDes") : t("AddRoleDes")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id="role-form"
            className="grid gap-4 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(debouncedSubmit)();
            }}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("Name")}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t("NamePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-4 ">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      {t("Description")}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("DescriptionPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 w-[150px]">
                    <FormLabel>{t("Status")}</FormLabel>
                    <FormControl>
                      <Switch
                        className="h-6 w-9"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <span>{field.value ? "ACTIVE" : "INACTIVE"}</span>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="permissions"
              render={() => (
                <FormItem>
                  <FormLabel>{t("Permissions")}</FormLabel>
                  <FormControl>
                    <Select
                      isMulti
                      options={groupedPermissions}
                      value={selectedPermissions}
                      onChange={handlePermissionChange}
                      getOptionLabel={(option) => option.label}
                      getOptionValue={(option) => option.value.toString()}
                      placeholder={t("SelectPermissions")}
                      className="basic-multi-select"
                      classNamePrefix="select"
                    />
                  </FormControl>
                  <FormMessage />
                  {selectedPermissions.map((p) => {
                    const methods = methodStates.get(p.module) || [];
                    const allEnabled = methods.every((m) => m.enabled);
                    return (
                      <div key={p.value} className="mt-2 p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Switch
                            className="h-6 w-9"
                            checked={allEnabled}
                            onCheckedChange={(checked) =>
                              handleModuleToggle(p.module, checked)
                            }
                          />
                          <span className="font-medium">{p.module}</span>
                        </div>
                        <div className="ml-6 mt-2 grid grid-cols-2 gap-2">
                          {methods.map((method) => (
                            <div
                              key={method.id}
                              className="flex items-center gap-2"
                            >
                              <Switch
                                className="h-6 w-9"
                                checked={method.enabled}
                                onCheckedChange={(checked) =>
                                  handleMethodToggle(
                                    p.module,
                                    method.id,
                                    checked
                                  )
                                }
                              />
                              <span>
                                {
                                  p.methods.find((m) => m.id === method.id)
                                    ?.name
                                }{" "}
                                -{" "}
                                <span
                                  className={`
                                      ${
                                        method.method === "POST"
                                          ? "text-orange-500 font-bold"
                                          : ""
                                      }
                                      ${
                                        method.method === "PUT"
                                          ? "text-blue-500 font-bold"
                                          : ""
                                      }
                                      ${
                                        method.method === "DELETE"
                                          ? "text-red-500 font-bold"
                                          : ""
                                      }
                                      ${
                                        method.method === "GET"
                                          ? "text-green-500 font-bold"
                                          : ""
                                      }
                                      `}
                                >
                                  {method.method}:
                                </span>{" "}
                                <span
                                  className={`text-gray-400 underline
                                      ${
                                        method.method === "POST"
                                          ? "text-orange-400 font-medium"
                                          : ""
                                      }
                                      ${
                                        method.method === "PUT"
                                          ? "text-blue-300 font-medium"
                                          : ""
                                      }
                                      ${
                                        method.method === "DELETE"
                                          ? "text-red-400 font-medium"
                                          : ""
                                      }
                                      ${
                                        method.method === "GET"
                                          ? "text-green-400 font-medium"
                                          : ""
                                      }
                                      `}
                                >
                                  {
                                    p.methods.find((m) => m.id === method.id)
                                      ?.apiPath
                                  }
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button
            type="submit"
            form="role-form"
            disabled={addRoleMutation.isPending || updateRoleMutation.isPending}
          >
            {isEdit ? t("UpdateRole") : t("AddRole")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
