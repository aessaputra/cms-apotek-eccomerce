'use client'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Address, Config } from '@/payload-types'
import { defaultCountries as supportedCountries, useAddresses } from '@payloadcms/plugin-ecommerce/client/react'
import React, { useCallback } from 'react'
import { useForm } from 'react-hook-form'

import { FormError } from '@/components/forms/FormError'
import { FormItem } from '@/components/forms/FormItem'
import { Button } from '@/components/ui/button'
import { deepMergeSimple } from 'payload/shared'
import { titles } from './constants'

type AddressFormValues = {
  title?: string | null
  firstName?: string | null
  lastName?: string | null
  company?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
  phone?: string | null
  label?: string
  addressType?: 'shipping' | 'billing' | 'both'
  isDefaultShipping?: boolean | null
  isDefaultBilling?: boolean | null
  deliveryInstructions?: string | null
  isActive?: boolean | null
}

type Props = {
  addressID?: Config['db']['defaultIDType']
  initialData?: Partial<Omit<Address, 'country' | 'id' | 'updatedAt' | 'createdAt'>> & { country?: string }
  callback?: (data: Partial<Address>) => void
  /**
   * If true, the form will not submit to the API.
   */
  skipSubmission?: boolean
}

export const AddressForm: React.FC<Props> = ({
  addressID,
  initialData,
  callback,
  skipSubmission,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<AddressFormValues>({
    defaultValues: {
      ...initialData,
      // Provide default values for required fields if not provided
      label: initialData?.label || '',
      addressType: initialData?.addressType || 'both',
      isActive: initialData?.isActive !== false, // Default to true unless explicitly false
    },
  })

  const { createAddress, updateAddress } = useAddresses()

  const onSubmit = useCallback(
    async (data: AddressFormValues) => {
      const newData = deepMergeSimple(initialData || {}, data)

      if (!skipSubmission) {
        if (addressID) {
          await updateAddress(addressID, newData)
        } else {
          await createAddress(newData)
        }
      }

      if (callback) {
        callback(newData)
      }
    },
    [initialData, skipSubmission, callback, addressID, updateAddress, createAddress],
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <FormItem className="shrink">
            <Label htmlFor="title">Title</Label>

            <Select
              {...register('title')}
              onValueChange={(value) => {
                setValue('title', value, { shouldValidate: true })
              }}
              defaultValue={initialData?.title || ''}
            >
              <SelectTrigger id="title">
                <SelectValue placeholder="Title" />
              </SelectTrigger>
              <SelectContent>
                {titles.map((title) => (
                  <SelectItem key={title} value={title}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.title && <FormError message={errors.title.message} />}
          </FormItem>

          <FormItem>
            <Label htmlFor="firstName">First name*</Label>
            <Input
              id="firstName"
              autoComplete="given-name"
              {...register('firstName', { required: 'First name is required.' })}
            />
            {errors.firstName && <FormError message={errors.firstName.message} />}
          </FormItem>

          <FormItem>
            <Label htmlFor="lastName">Last name*</Label>
            <Input
              autoComplete="family-name"
              id="lastName"
              {...register('lastName', { required: 'Last name is required.' })}
            />
            {errors.lastName && <FormError message={errors.lastName.message} />}
          </FormItem>
        </div>

        <FormItem>
          <Label htmlFor="phone">Phone</Label>
          <Input type="tel" id="phone" autoComplete="mobile tel" {...register('phone')} />
          {errors.phone && <FormError message={errors.phone.message} />}
        </FormItem>

        <FormItem>
          <Label htmlFor="company">Company</Label>
          <Input id="company" autoComplete="organization" {...register('company')} />
          {errors.company && <FormError message={errors.company.message} />}
        </FormItem>

        <FormItem>
          <Label htmlFor="addressLine1">Address line 1*</Label>
          <Input
            id="addressLine1"
            autoComplete="address-line1"
            {...register('addressLine1', { required: 'Address line 1 is required.' })}
          />
          {errors.addressLine1 && <FormError message={errors.addressLine1.message} />}
        </FormItem>

        <FormItem>
          <Label htmlFor="addressLine2">Address line 2</Label>
          <Input id="addressLine2" autoComplete="address-line2" {...register('addressLine2')} />
          {errors.addressLine2 && <FormError message={errors.addressLine2.message} />}
        </FormItem>

        <FormItem>
          <Label htmlFor="city">City*</Label>
          <Input
            id="city"
            autoComplete="address-level2"
            {...register('city', { required: 'City is required.' })}
          />
          {errors.city && <FormError message={errors.city.message} />}
        </FormItem>

        <FormItem>
          <Label htmlFor="state">State</Label>
          <Input id="state" autoComplete="address-level1" {...register('state')} />
          {errors.state && <FormError message={errors.state.message} />}
        </FormItem>

        <FormItem>
          <Label htmlFor="postalCode">Zip Code*</Label>
          <Input
            id="postalCode"
            {...register('postalCode', { required: 'Postal code is required.' })}
          />
          {errors.postalCode && <FormError message={errors.postalCode.message} />}
        </FormItem>

        <FormItem>
          <Label htmlFor="country">Country*</Label>

          <Select
            {...register('country', {
              required: 'Country is required.',
            })}
            onValueChange={(value) => {
              setValue('country', value, { shouldValidate: true })
            }}
            required
            defaultValue={initialData?.country || ''}
          >
            <SelectTrigger id="country" className="w-full">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              {supportedCountries.map((country) => {
                const value = typeof country === 'string' ? country : country.value
                const label =
                  typeof country === 'string'
                    ? country
                    : typeof country.label === 'string'
                      ? country.label
                      : value

                return (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          {errors.country && <FormError message={errors.country.message} />}
        </FormItem>

        <FormItem>
          <Label htmlFor="label">Address Label*</Label>
          <Input
            id="label"
            placeholder="e.g., Home, Office, Mom's House"
            {...register('label', { required: 'Address label is required.' })}
          />
          {errors.label && <FormError message={errors.label.message} />}
        </FormItem>

        <FormItem>
          <Label htmlFor="addressType">Address Type*</Label>
          <Select
            {...register('addressType', {
              required: 'Address type is required.',
            })}
            onValueChange={(value) => {
              setValue('addressType', value as 'shipping' | 'billing' | 'both', { shouldValidate: true })
            }}
            required
            defaultValue={initialData?.addressType || 'both'}
          >
            <SelectTrigger id="addressType" className="w-full">
              <SelectValue placeholder="Select address type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shipping">Shipping Only</SelectItem>
              <SelectItem value="billing">Billing Only</SelectItem>
              <SelectItem value="both">Both Shipping and Billing</SelectItem>
            </SelectContent>
          </Select>
          {errors.addressType && <FormError message={errors.addressType.message} />}
        </FormItem>

        <div className="flex flex-col md:flex-row gap-4">
          <FormItem>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefaultShipping"
                defaultChecked={initialData?.isDefaultShipping || false}
                {...register('isDefaultShipping')}
                onCheckedChange={(checked: boolean) => {
                  setValue('isDefaultShipping', checked)
                }}
              />
              <Label htmlFor="isDefaultShipping">Set as default shipping address</Label>
            </div>
            {errors.isDefaultShipping && <FormError message={errors.isDefaultShipping.message} />}
          </FormItem>

          <FormItem>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefaultBilling"
                defaultChecked={initialData?.isDefaultBilling || false}
                {...register('isDefaultBilling')}
                onCheckedChange={(checked: boolean) => {
                  setValue('isDefaultBilling', checked)
                }}
              />
              <Label htmlFor="isDefaultBilling">Set as default billing address</Label>
            </div>
            {errors.isDefaultBilling && <FormError message={errors.isDefaultBilling.message} />}
          </FormItem>
        </div>

        <FormItem>
          <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
          <Input
            id="deliveryInstructions"
            placeholder="e.g., Leave at front door, Ring doorbell twice"
            {...register('deliveryInstructions')}
          />
          {errors.deliveryInstructions && <FormError message={errors.deliveryInstructions.message} />}
        </FormItem>

        <FormItem>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              defaultChecked={initialData?.isActive !== false}
              {...register('isActive')}
              onCheckedChange={(checked: boolean) => {
                setValue('isActive', checked)
              }}
            />
            <Label htmlFor="isActive">Address is active</Label>
          </div>
          {errors.isActive && <FormError message={errors.isActive.message} />}
        </FormItem>
      </div>

      <Button type="submit">Submit</Button>
    </form>
  )
}
