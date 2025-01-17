import Button from '../../../../admin-x-ds/global/Button';
import Form from '../../../../admin-x-ds/global/form/Form';
import Heading from '../../../../admin-x-ds/global/Heading';
import Icon from '../../../../admin-x-ds/global/Icon';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import Select from '../../../../admin-x-ds/global/form/Select';
import SortableList from '../../../../admin-x-ds/global/SortableList';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import TierDetailPreview from './TierDetailPreview';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import useForm from '../../../../hooks/useForm';
import useRouting from '../../../../hooks/useRouting';
import useSortableIndexedList from '../../../../hooks/useSortableIndexedList';
import {Tier} from '../../../../types/api';
import {currencies, currencyFromDecimal, currencyGroups, currencyToDecimal, getSymbol} from '../../../../utils/currency';
import {showToast} from '../../../../admin-x-ds/global/Toast';
import {useTiers} from '../../../providers/ServiceProvider';

interface TierDetailModalProps {
    tier?: Tier
}

type TierFormState = Partial<Omit<Tier, 'monthly_price' | 'yearly_price' | 'trial_days'>> & {
    monthly_price: string;
    yearly_price: string;
    trial_days: string;
};

const TierDetailModal: React.FC<TierDetailModalProps> = ({tier}) => {
    const isFreeTier = tier?.type === 'free';

    const modal = useModal();
    const {updateRoute} = useRouting();
    const {update: updateTier, create: createTier} = useTiers();
    const [hasFreeTrial, setHasFreeTrial] = React.useState(!!tier?.trial_days);

    const [errors, setErrors] = useState<{ [key in keyof Tier]?: string }>({}); // eslint-disable-line no-unused-vars

    const setError = (field: keyof Tier, error: string | undefined) => {
        setErrors({...errors, [field]: error});
    };

    const {formState, updateForm, handleSave} = useForm<TierFormState>({
        initialState: {
            ...(tier || {}),
            monthly_price: tier?.monthly_price ? currencyToDecimal(tier.monthly_price).toString() : '',
            yearly_price: tier?.yearly_price ? currencyToDecimal(tier.yearly_price).toString() : '',
            trial_days: tier?.trial_days?.toString() || '',
            currency: tier?.currency || currencies[0].isoCode
        },
        onSave: async () => {
            if (Object.values(errors).some(error => error)) {
                showToast({
                    type: 'pageError',
                    message: 'One or more fields have errors'
                });
                return;
            }

            const {monthly_price: monthlyPrice, yearly_price: yearlyPrice, trial_days: trialDays, currency, ...rest} = formState;
            const values: Partial<Tier> = rest;

            values.benefits = values.benefits?.filter(benefit => benefit);

            if (!isFreeTier) {
                values.currency = currency;
                values.monthly_price = currencyFromDecimal(parseFloat(monthlyPrice));
                values.yearly_price = currencyFromDecimal(parseFloat(yearlyPrice));
                values.trial_days = parseInt(formState.trial_days);
            }

            if (tier?.id) {
                await updateTier({...tier, ...values});
            } else {
                await createTier(values);
            }

            modal.remove();
        }
    });

    const benefits = useSortableIndexedList({
        items: formState.benefits || [],
        setItems: newBenefits => updateForm(state => ({...state, benefits: newBenefits})),
        blank: '',
        canAddNewItem: item => !!item
    });

    const forceCurrencyValue = (value: string) => {
        return value.match(/[\d]+\.?[\d]{0,2}/)?.[0] || '';
    };

    const currencySymbol = formState.currency ? getSymbol(formState.currency) : '$';

    return <Modal
        afterClose={() => {
            updateRoute('tiers');
        }}
        okLabel='Save & close'
        size='lg'
        title='Tier'
        stickyFooter
        onOk={handleSave}
    >
        <div className='mt-8 flex items-start gap-10'>
            <div className='flex grow flex-col gap-5'>
                <Form title='Basic' grouped>
                    {!isFreeTier && <TextField
                        error={Boolean(errors.name)}
                        hint={errors.name}
                        placeholder='Bronze'
                        title='Name'
                        value={formState.name || ''}
                        onBlur={e => setError('name', e.target.value ? undefined : 'You must specify a name')}
                        onChange={e => updateForm(state => ({...state, name: e.target.value}))}
                    />}
                    <TextField
                        placeholder='Full access to premium content'
                        title='Description'
                        value={formState.description || ''}
                        onChange={e => updateForm(state => ({...state, description: e.target.value}))}
                    />
                    {!isFreeTier && <div className='flex gap-10'>
                        <div className='basis-1/2'>
                            <div className='mb-1 flex h-6 items-center justify-between'>
                                <Heading level={6}>Prices</Heading>
                                <div className='w-10'>
                                    <Select
                                        border={false}
                                        options={Object.values(currencyGroups()).map(group => ({
                                            label: '—',
                                            options: group.map(({isoCode,name}) => ({
                                                value: isoCode,
                                                label: `${isoCode} - ${name}`
                                            }))
                                        }))}
                                        selectClassName='font-medium'
                                        size='xs'
                                        onSelect={currency => updateForm(state => ({...state, currency}))}
                                    />
                                </div>
                            </div>
                            <div className='flex flex-col gap-2'>
                                <TextField
                                    error={Boolean(errors.monthly_price)}
                                    hint={errors.monthly_price}
                                    placeholder='1'
                                    rightPlaceholder={`${formState.currency}/month`}
                                    value={formState.monthly_price}
                                    onBlur={e => setError('monthly_price', e.target.value ? undefined : `Subscription amount must be at least ${currencySymbol}1.00`)}
                                    onChange={e => updateForm(state => ({...state, monthly_price: forceCurrencyValue(e.target.value)}))}
                                />
                                <TextField
                                    error={Boolean(errors.yearly_price)}
                                    hint={errors.yearly_price}
                                    placeholder='10'
                                    rightPlaceholder={`${formState.currency}/year`}
                                    value={formState.yearly_price}
                                    onBlur={e => setError('yearly_price', e.target.value ? undefined : `Subscription amount must be at least ${currencySymbol}1.00`)}
                                    onChange={e => updateForm(state => ({...state, yearly_price: forceCurrencyValue(e.target.value)}))}
                                />
                            </div>
                        </div>
                        <div className='basis-1/2'>
                            <div className='mb-1 flex h-6 items-center justify-between'>
                                <Heading level={6}>Add a free trial</Heading>
                                <Toggle onChange={e => setHasFreeTrial(e.target.checked)} />
                            </div>
                            <TextField
                                disabled={!hasFreeTrial}
                                hint={<>
                                    Members will be subscribed at full price once the trial ends. <a href="https://ghost.org/" rel="noreferrer" target="_blank">Learn more</a>
                                </>}
                                placeholder='0'
                                rightPlaceholder='days'
                                value={formState.trial_days}
                                onChange={e => updateForm(state => ({...state, trial_days: e.target.value.replace(/[^\d]/, '')}))}
                            />
                        </div>
                    </div>}
                </Form>

                <Form gap='none' title='Benefits' grouped>
                    <SortableList
                        items={benefits.items}
                        itemSeparator={false}
                        renderItem={({id, item}) => <div className='relative flex w-full items-center gap-5'>
                            <div className='absolute left-[-32px] top-[7px] flex h-6 w-6 items-center justify-center bg-white group-hover:hidden'><Icon name='check' size='sm' /></div>
                            <TextField
                                className='grow border-b border-grey-500 py-2 focus:border-grey-800 group-hover:border-grey-600'
                                value={item}
                                unstyled
                                onChange={e => benefits.updateItem(id, e.target.value)}
                            />
                            <Button className='absolute right-0 top-1' icon='trash' iconColorClass='opacity-0 group-hover:opacity-100' size='sm' onClick={() => benefits.removeItem(id)} />
                        </div>}
                        onMove={benefits.moveItem}
                    />
                    <div className="relative mt-0.5 flex items-center gap-3">
                        <Icon name='check' size='sm' />
                        <TextField
                            className='grow'
                            placeholder='New benefit'
                            value={benefits.newItem}
                            onChange={e => benefits.setNewItem(e.target.value)}
                        />
                        <Button className='absolute right-0 top-1' color='green' icon="add" iconColorClass='text-white' size='sm' onClick={() => benefits.addItem()} />
                    </div>
                </Form>
            </div>
            <div className='sticky top-[77px] shrink-0 basis-[380px]'>
                <TierDetailPreview isFreeTier={isFreeTier} tier={formState} />
            </div>
        </div>
    </Modal>;
};

export default NiceModal.create(TierDetailModal);
