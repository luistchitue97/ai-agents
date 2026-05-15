"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { createOrganization } from "../actions"
import { signOutAction } from "@/app/auth-actions"

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name must be 60 characters or fewer"),
})

export function CreateOrganizationForm({ userEmail }: { userEmail: string }) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  })
  const [isPending, startTransition] = React.useTransition()

  function onSubmit(values: z.infer<typeof schema>) {
    startTransition(async () => {
      try {
        await createOrganization(values)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create organization."
        // Next.js redirect() throws a special error — let it propagate.
        if (msg.toLowerCase().includes("next_redirect")) throw err
        form.setError("root", { message: msg })
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization name</FormLabel>
              <FormControl>
                <Input
                  autoFocus
                  placeholder="e.g. Acme Inc."
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-destructive text-sm">{form.formState.errors.root.message}</p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create organization"}
        </Button>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Signed in as {userEmail}</span>
          <button
            type="button"
            onClick={() => signOutAction()}
            className="underline-offset-2 hover:underline"
          >
            Sign out
          </button>
        </div>
      </form>
    </Form>
  )
}
